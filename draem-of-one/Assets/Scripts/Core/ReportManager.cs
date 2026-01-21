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
        public ReportReason reason = ReportReason.RepeatedRuleBreak;
        public bool resolved = false;
    }

    /// <summary>
    /// 신고 이벤트 큐를 관리하고 경찰 심문 조건을 판별한다.
    /// 신고와 판정 사이의 느슨한 결합을 위해 별도 컴포넌트로 분리했다.
    /// </summary>
    public sealed class ReportManager : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("신고 이벤트를 기록할 WEL")]
        private WorldEventLog eventLog = null;

        [SerializeField]
        [Tooltip("전역 G 조건을 확인하기 위한 시스템")]
        private GlobalSuspicionSystem globalSuspicion = null;

        [SerializeField]
        [Tooltip("심문을 트리거하기 위해 필요한 최소 신고 수")]
        private int reportsRequired = 2;

        [SerializeField]
        [Tooltip("심문 완료 후 다시 심문하기 전까지의 쿨다운")]
        private float interrogationCooldownSeconds = 20f;

        [SerializeField]
        [Tooltip("신고 유효 기간(초)")]
        private float reportWindowSeconds = 45f;

        [SerializeField]
        [Tooltip("심문에 첨부할 최대 이벤트 수")]
        private int maxAttachedEvents = 3;

        private struct ReportEntry
        {
            public float timestamp;
            public string reporterId;
            public string ruleId;
            public string eventId;
        }

        /// <summary>최근 신고를 시간순으로 저장한다.</summary>
        private readonly List<ReportEntry> recentReports = new();
        private float lastInterrogationTime = -999f;

        /// <summary>
        /// SuspicionComponent가 신고를 접수할 때 호출된다.
        /// </summary>
        public void FileReport(string reporterId, string ruleId, float suspicionSnapshot, string eventId = "")
        {
            float now = Time.time;
            recentReports.Add(new ReportEntry
            {
                timestamp = now,
                reporterId = reporterId,
                ruleId = ruleId,
                eventId = eventId
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
                    severity = 2
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
                reason = globalSuspicion != null && globalSuspicion.GlobalSuspicion >= 0.3f
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

            if (recentReports.Count < reportsRequired)
            {
                return false;
            }

            if (globalSuspicion != null && globalSuspicion.GlobalSuspicion < 0.3f)
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
