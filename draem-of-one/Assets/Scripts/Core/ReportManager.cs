using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
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

        /// <summary>최근 신고 타임스탬프를 시간순으로 저장한다.</summary>
        private readonly Queue<float> recentReports = new();
        private float lastInterrogationTime = -999f;

        /// <summary>
        /// SuspicionComponent가 신고를 접수할 때 호출된다.
        /// </summary>
        public void FileReport(string reporterId, string ruleId, float suspicionSnapshot)
        {
            float now = Time.time;
            recentReports.Enqueue(now);

            while (recentReports.Count > 0 && now - recentReports.Peek() > 60f)
            {
                recentReports.Dequeue();
            }

            if (eventLog != null)
            {
                eventLog.RecordEvent(new EventRecord
                {
                    actorId = reporterId,
                    actorRole = "Citizen",
                    eventType = EventType.ReportFiled,
                    ruleId = ruleId,
                    note = $"s={suspicionSnapshot:0}"
                });
            }
        }

        /// <summary>
        /// 신고 수와 전역 G를 기준으로 경찰이 심문해야 하는지 판단한다.
        /// </summary>
        public bool ShouldTriggerInterrogation()
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

            lastInterrogationTime = now;
            return true;
        }

        private void PruneExpiredReports(float now)
        {
            while (recentReports.Count > 0 && now - recentReports.Peek() > 45f)
            {
                recentReports.Dequeue();
            }
        }
    }
}
