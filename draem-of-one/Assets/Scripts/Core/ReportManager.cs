using System;
using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    public enum ReportReason
    {
        RepeatedRuleBreak,
        HighGlobalG,
        Scripted
    }

    [Serializable]
    public sealed class ReportEnvelope
    {
        public string reportId = string.Empty;
        public List<string> reporterIds = new();
        public List<string> attachedEventIds = new();
        public string ruleId = string.Empty;
        public string topic = string.Empty;
        public string placeId = string.Empty;
        public string zoneId = string.Empty;
        public ReportReason reason = ReportReason.RepeatedRuleBreak;
    }

    /// <summary>
    /// 신고를 수집해 경찰 심문을 트리거하는 관리 시스템.
    /// </summary>
    public sealed class ReportManager : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("신고 이벤트 로그")]
        private WorldEventLog eventLog = null;

        [SerializeField]
        [Tooltip("전역 G 조건을 확인하기 위한 시스템")]
        private GlobalSuspicionSystem globalSuspicion = null;

        [SerializeField]
        [Tooltip("심문을 트리거하기 위해 필요한 최소 신고 수")]
        private int reportsRequired = 2;

        [SerializeField]
        [Tooltip("심문 조건으로 사용하는 전역 G 임계값")]
        private float globalSuspicionThreshold = 0.2f;

        [SerializeField]
        [Tooltip("사회 압력 강화 임계값 (G가 높을 때 요구 신고 수 감소)")]
        private float socialPressureThreshold = 0.6f;

        [SerializeField]
        [Tooltip("심문 완료 후 다시 심문하기 전까지의 쿨다운")]
        private float interrogationCooldownSeconds = 20f;

        [SerializeField]
        [Tooltip("신고 유효 기간(초)")]
        private float reportWindowSeconds = 90f;

        [SerializeField]
        [Tooltip("심문에 첨부할 최대 이벤트 수")]
        private int maxAttachedEvents = 3;

        private struct ReportEntry
        {
            public float timestamp;
            public string reporterId;
            public string ruleId;
            public string eventId;
            public string placeId;
            public string zoneId;
            public string topic;
            public Vector3 position;
        }

        /// <summary>최근 신고를 시간순으로 저장한다.</summary>
        private readonly List<ReportEntry> recentReports = new();
        private float lastInterrogationTime = -999f;

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (globalSuspicion == null)
            {
                globalSuspicion = FindFirstObjectByType<GlobalSuspicionSystem>();
            }
        }

        /// <summary>
        /// SuspicionComponent가 신고를 접수할 때 호출된다.
        /// </summary>
        public void FileReport(string reporterId, string ruleId, float suspicionSnapshot, string eventId = "", Vector3 position = default)
        {
            float now = Time.time;
            string placeId = string.Empty;
            string zoneId = string.Empty;
            string topic = ruleId;
            Vector3 eventPosition = position;

            if (eventLog != null && !string.IsNullOrEmpty(eventId) && eventLog.TryGetEventById(eventId, out var source))
            {
                placeId = source.placeId;
                zoneId = source.zoneId;
                topic = string.IsNullOrEmpty(source.topic) ? ruleId : source.topic;
                if (eventPosition == Vector3.zero)
                {
                    eventPosition = source.position;
                }
            }

            recentReports.Add(new ReportEntry
            {
                timestamp = now,
                reporterId = reporterId,
                ruleId = ruleId,
                eventId = eventId,
                placeId = placeId,
                zoneId = zoneId,
                topic = topic,
                position = eventPosition
            });

            PruneExpiredReports(now);

            if (eventLog != null)
            {
                eventLog.RecordEvent(new EventRecord
                {
                    actorId = reporterId,
                    actorRole = "Citizen",
                    eventType = EventType.ReportFiled,
                    category = EventCategory.Report,
                    ruleId = ruleId,
                    note = $"s={suspicionSnapshot:0}",
                    severity = 2,
                    position = eventPosition,
                    topic = topic,
                    placeId = placeId,
                    zoneId = zoneId
                });
            }
        }

        /// <summary>
        /// 신고 수와 전역 G를 기준으로 경찰이 심문해야 하는지 판단한다.
        /// </summary>
        public bool ShouldTriggerInterrogation()
        {
            return CanTriggerInterrogation();
        }

        public bool TryConsumeReport(out ReportEnvelope envelope)
        {
            envelope = null;

            if (!CanTriggerInterrogation())
            {
                return false;
            }

            int takeCount = Mathf.Min(reportsRequired, recentReports.Count);
            int startIndex = Mathf.Max(0, recentReports.Count - takeCount);

            envelope = new ReportEnvelope
            {
                reportId = Guid.NewGuid().ToString("N"),
                reason = globalSuspicion != null && globalSuspicion.GlobalSuspicion >= globalSuspicionThreshold
                    ? ReportReason.HighGlobalG
                    : ReportReason.RepeatedRuleBreak
            };

            for (int i = startIndex; i < recentReports.Count; i++)
            {
                var entry = recentReports[i];
                if (!string.IsNullOrEmpty(entry.reporterId) && !envelope.reporterIds.Contains(entry.reporterId))
                {
                    envelope.reporterIds.Add(entry.reporterId);
                }

                if (!string.IsNullOrEmpty(entry.eventId) && envelope.attachedEventIds.Count < maxAttachedEvents)
                {
                    envelope.attachedEventIds.Add(entry.eventId);
                }

                if (string.IsNullOrEmpty(envelope.ruleId))
                {
                    envelope.ruleId = entry.ruleId;
                    envelope.topic = entry.topic;
                    envelope.placeId = entry.placeId;
                    envelope.zoneId = entry.zoneId;
                }
            }

            recentReports.RemoveRange(startIndex, takeCount);
            lastInterrogationTime = Time.time;
            return true;
        }

        private bool CanTriggerInterrogation()
        {
            float now = Time.time;
            if (now - lastInterrogationTime < interrogationCooldownSeconds)
            {
                return false;
            }

            PruneExpiredReports(now);

            int required = reportsRequired;
            if (globalSuspicion != null && globalSuspicion.GlobalSuspicion >= socialPressureThreshold)
            {
                required = Mathf.Max(1, reportsRequired - 1);
            }

            if (recentReports.Count < required)
            {
                return false;
            }

            if (globalSuspicion != null && globalSuspicion.GlobalSuspicion < globalSuspicionThreshold)
            {
                return false;
            }

            return true;
        }

        private void PruneExpiredReports(float now)
        {
            for (int i = recentReports.Count - 1; i >= 0; i--)
            {
                if (now - recentReports[i].timestamp > reportWindowSeconds)
                {
                    recentReports.RemoveAt(i);
                }
            }
        }

        public void Configure(WorldEventLog log, GlobalSuspicionSystem suspicion)
        {
            eventLog = log;
            globalSuspicion = suspicion;
        }
    }
}
