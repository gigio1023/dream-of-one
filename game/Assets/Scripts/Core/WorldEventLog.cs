using System.Collections.Generic;
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

        public IReadOnlyList<EventRecord> Events => events;

        /// <summary>
        /// 외부에서 전달한 이벤트를 시간 정보와 함께 버퍼에 쌓는다.
        /// </summary>
        public void RecordEvent(EventRecord record)
        {
            record.timestamp = Time.time;
            events.Add(record);

            if (events.Count > bufferSize)
            {
                events.RemoveAt(0);
            }

            if (echoToConsole)
            {
                Debug.Log($"[WEL] {record.timestamp:F1}s {record.eventType} {record.actorId} {record.note}");
            }
        }

        /// <summary>
        /// Zone 트리거 전용 헬퍼. 굳이 새로운 코드 없이 공통 경로를 사용한다.
        /// </summary>
        public void RecordZoneEvent(string actorId, string zoneId, ZoneType zoneType, bool entered)
        {
            var record = new EventRecord
            {
                actorId = actorId,
                actorRole = "Unknown",
                eventType = entered ? EventType.EnteredZone : EventType.ExitedZone,
                zoneId = zoneId,
                note = zoneType.ToString()
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
    }
}


