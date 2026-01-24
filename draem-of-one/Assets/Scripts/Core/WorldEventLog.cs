using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 월드에서 발생하는 모든 이벤트를 append-only 방식으로 저장하는 경량 로그.
    /// JSON 파일 쓰기 등은 우선순위가 아니므로 메모리 버퍼로만 관리한다.
    /// </summary>
    public sealed class WorldEventLog : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("버퍼에 유지할 최대 이벤트 수")]
        private int bufferSize = 512;

        [SerializeField]
        [Tooltip("에디터 디버깅을 위해 콘솔 출력 여부")]
        private bool echoToConsole = true;

        /// <summary>최신 이벤트 순으로 누적되는 버퍼.</summary>
        private readonly List<EventRecord> events = new();
        private readonly Queue<string> fileWriteQueue = new();
        private bool isWritingFile = false;
        private string logFilePath = null;
        private int totalEvents = 0;
        private int droppedEvents = 0;

        public IReadOnlyList<EventRecord> Events => events;
        public int TotalEvents => totalEvents;
        public int DroppedEvents => droppedEvents;
        public string LogFilePath
        {
            get
            {
                if (string.IsNullOrEmpty(logFilePath))
                {
                    var logDir = Path.Combine(Application.persistentDataPath, "Logs");
                    Directory.CreateDirectory(logDir);
                    logFilePath = Path.Combine(logDir, "world-event-log.jsonl");
                }

                return logFilePath;
            }
        }

        public event Action<EventRecord> OnEventRecorded;

        [Serializable]
        private struct LogLine
        {
            public string utc;
            public float stamp;
            public string id;
            public string eventType;
            public string category;
            public string actorId;
            public string actorRole;
            public string ruleId;
            public string zoneId;
            public string placeId;
            public string topic;
            public string note;
            public int severity;
            public float trust;
        }

        private void Awake()
        {
            var logDir = Path.Combine(Application.persistentDataPath, "Logs");
            Directory.CreateDirectory(logDir);
            logFilePath = Path.Combine(logDir, "world-event-log.jsonl");
        }

        /// <summary>
        /// 외부에서 전달한 이벤트를 시간 정보와 함께 버퍼에 쌓는다.
        /// </summary>
        public void RecordEvent(EventRecord record)
        {
            record.id = string.IsNullOrEmpty(record.id) ? Guid.NewGuid().ToString("N") : record.id;
            record.stamp = Time.time;
            record.category = InferCategory(record.eventType);
            if (string.IsNullOrEmpty(record.placeId) && !string.IsNullOrEmpty(record.zoneId))
            {
                record.placeId = record.zoneId;
            }

            if (string.IsNullOrEmpty(record.topic))
            {
                record.topic = !string.IsNullOrEmpty(record.ruleId) ? record.ruleId : record.eventType.ToString();
            }

            if (ShouldSkipDuplicate(record))
            {
                return;
            }
            events.Add(record);
            totalEvents++;

            if (events.Count > bufferSize)
            {
                events.RemoveAt(0);
                droppedEvents++;
            }

            if (echoToConsole)
            {
                Debug.Log($"[WEL] {record.stamp:F1}s {record.eventType} {record.actorId} {record.note}");
            }

            if (!string.IsNullOrEmpty(logFilePath))
            {
                EnqueueFileWrite(record);
            }

            OnEventRecorded?.Invoke(record);
            EventBus.Publish(record);
        }

        public void ResetLog()
        {
            events.Clear();
            totalEvents = 0;
            droppedEvents = 0;
            lastEventTimeByKey.Clear();

            lock (fileWriteQueue)
            {
                fileWriteQueue.Clear();
            }
        }

        public bool TryGetEventById(string eventId, out EventRecord record)
        {
            record = null;
            if (string.IsNullOrEmpty(eventId))
            {
                return false;
            }

            for (int i = events.Count - 1; i >= 0; i--)
            {
                if (events[i].id == eventId)
                {
                    record = events[i];
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// Zone 트리거 전용 헬퍼. 굳이 새로운 코드 없이 공통 경로를 사용한다.
        /// </summary>
        public void RecordZoneEvent(string actorId, string zoneId, ZoneType zoneType, bool entered, Vector3 position)
        {
            var record = new EventRecord
            {
                actorId = actorId,
                actorRole = "Unknown",
                eventType = entered ? EventType.EnteredZone : EventType.ExitedZone,
                zoneId = zoneId,
                placeId = zoneId,
                category = EventCategory.Zone,
                note = zoneType.ToString(),
                position = position
            };

            RecordEvent(record);
        }

        /// <summary>
        /// 최근 N개의 이벤트를 가져와 판정·UI·LLM 등에 활용한다.
        /// </summary>
        public List<EventRecord> GetRecent(int count)
        {
            if (count <= 0)
            {
                return new List<EventRecord>();
            }

            int start = Mathf.Max(0, events.Count - count);
            return events.GetRange(start, events.Count - start);
        }

        /// <summary>
        /// 드롭되는 이벤트까지 포함한 전체 로그를 비동기 파일에 남긴다.
        /// 게임 루프와 분리해 성능 영향이 없도록 큐 기반으로 처리한다.
        /// </summary>
        private void EnqueueFileWrite(EventRecord record)
        {
            string line = JsonUtility.ToJson(new LogLine
            {
                utc = DateTime.UtcNow.ToString("O"),
                stamp = record.stamp,
                id = record.id,
                eventType = record.eventType.ToString(),
                category = record.category.ToString(),
                actorId = record.actorId,
                actorRole = record.actorRole,
                ruleId = record.ruleId,
                zoneId = record.zoneId,
                placeId = record.placeId,
                topic = record.topic,
                note = record.note,
                severity = record.severity,
                trust = record.trust
            });
            lock (fileWriteQueue)
            {
                fileWriteQueue.Enqueue(line);
                if (!isWritingFile)
                {
                    isWritingFile = true;
                    _ = Task.Run(ProcessFileQueue);
                }
            }
        }

        private async Task ProcessFileQueue()
        {
            while (true)
            {
                string line;
                lock (fileWriteQueue)
                {
                    if (fileWriteQueue.Count == 0)
                    {
                        isWritingFile = false;
                        return;
                    }

                    line = fileWriteQueue.Dequeue();
                }

                try
                {
                    await File.AppendAllTextAsync(logFilePath, line + Environment.NewLine);
                }
                catch (Exception ex)
                {
                    // 파일 접근 실패 시 플레이를 막지 않도록 로그만 남기고 계속 진행한다.
                    Debug.LogWarning($"[WEL] 파일 로그 실패: {ex.Message}");
                }
            }
        }

        private static EventCategory InferCategory(EventType eventType)
        {
            return eventType switch
            {
                EventType.EnteredZone => EventCategory.Zone,
                EventType.ExitedZone => EventCategory.Zone,
                EventType.ViolationDetected => EventCategory.Rule,
                EventType.SuspicionUpdated => EventCategory.Suspicion,
                EventType.ReportFiled => EventCategory.Report,
                EventType.InterrogationStarted => EventCategory.Verdict,
                EventType.VerdictGiven => EventCategory.Verdict,
                EventType.StatementGiven => EventCategory.Verdict,
                EventType.ExplanationGiven => EventCategory.Verdict,
                EventType.RebuttalGiven => EventCategory.Verdict,
                EventType.NpcUtterance => EventCategory.Dialogue,
                EventType.RumorShared => EventCategory.Gossip,
                EventType.RumorConfirmed => EventCategory.Gossip,
                EventType.RumorDebunked => EventCategory.Gossip,
                EventType.EvidenceCaptured => EventCategory.Evidence,
                EventType.TicketIssued => EventCategory.Evidence,
                EventType.CctvCaptured => EventCategory.Evidence,
                EventType.TaskStarted => EventCategory.Procedure,
                EventType.TaskCompleted => EventCategory.Procedure,
                EventType.ApprovalGranted => EventCategory.Procedure,
                EventType.RcInserted => EventCategory.Procedure,
                EventType.LabelChanged => EventCategory.Organization,
                EventType.PaymentProcessed => EventCategory.Organization,
                EventType.QueueUpdated => EventCategory.Organization,
                EventType.SeatClaimed => EventCategory.Organization,
                EventType.NoiseObserved => EventCategory.Organization,
                _ => EventCategory.Rule
            };
        }

        [SerializeField]
        [Tooltip("동일 이벤트 연속 중복 방지")]
        private bool enableDeduplication = true;

        [SerializeField]
        [Tooltip("중복 이벤트를 무시할 시간 간격(초)")]
        private float dedupeWindowSeconds = 0.25f;

        [SerializeField]
        [Tooltip("중복 방지에서 제외할 이벤트 타입")]
        private EventType[] dedupeIgnoreTypes = new[]
        {
            EventType.VerdictGiven,
            EventType.InterrogationStarted,
            EventType.ReportFiled,
            EventType.NpcUtterance,
            EventType.StatementGiven,
            EventType.ExplanationGiven,
            EventType.RebuttalGiven
        };

        private readonly Dictionary<string, float> lastEventTimeByKey = new();

        private bool ShouldSkipDuplicate(EventRecord record)
        {
            if (!enableDeduplication)
            {
                return false;
            }

            for (int i = 0; i < dedupeIgnoreTypes.Length; i++)
            {
                if (record.eventType == dedupeIgnoreTypes[i])
                {
                    return false;
                }
            }

            string key = $"{record.eventType}|{record.actorId}|{record.topic}|{record.placeId}";
            float now = Time.time;
            if (lastEventTimeByKey.TryGetValue(key, out float lastTime))
            {
                if (now - lastTime < dedupeWindowSeconds)
                {
                    return true;
                }
            }

            lastEventTimeByKey[key] = now;
            return false;
        }
    }
}
