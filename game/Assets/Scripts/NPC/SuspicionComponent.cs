using DreamOfOne.Core;
using UnityEngine;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// NPC 개인 의심 수치 sᵢ를 관리하고 임계 도달 시 신고를 발생시킨다.
    /// </summary>
    public sealed class SuspicionComponent : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("의심 수치 상한")]
        private float maxSuspicion = 100f;

        [SerializeField]
        [Tooltip("초당 감소 수치")]
        private float decayPerSecond = 5f;

        [SerializeField]
        [Tooltip("신고를 일으킬 최소 의심 수치")]
        private float reportThreshold = 40f;

        [SerializeField]
        [Tooltip("신고 후 다시 신고할 수 있을 때까지의 대기 시간")]
        private float reportCooldownSeconds = 20f;

        [SerializeField]
        [Tooltip("신고를 수집할 ReportManager")]
        private ReportManager reportManager = null;

        [SerializeField]
        [Tooltip("전역 G 계산을 위한 시스템")]
        private GlobalSuspicionSystem globalSuspicion = null;

        [SerializeField]
        [Tooltip("의심 증감 이벤트를 기록할 로그")]
        private WorldEventLog eventLog = null;

        private float suspicion = 0f;
        private float lastReportTimestamp = -999f;

        public float CurrentSuspicion => suspicion;
        public float CurrentSuspicionNormalized => Mathf.Clamp01(suspicion / Mathf.Max(1f, maxSuspicion));

        private void OnEnable()
        {
            globalSuspicion?.Register(this);
        }

        private void OnDisable()
        {
            globalSuspicion?.Unregister(this);
        }

        private void Update()
        {
            if (suspicion <= 0f)
            {
                return;
            }

            suspicion = Mathf.Max(0f, suspicion - decayPerSecond * Time.deltaTime);
            globalSuspicion?.Recalculate();
        }

        /// <summary>
        /// 규칙 위반을 목격했을 때 호출해 의심을 누적한다.
        /// </summary>
        public void AddSuspicion(float delta, string ruleId)
        {
            suspicion = Mathf.Clamp(suspicion + delta, 0f, maxSuspicion);
            globalSuspicion?.Recalculate();

            if (eventLog != null)
            {
                eventLog.RecordEvent(new EventRecord
                {
                    actorId = name,
                    actorRole = "Citizen",
                    eventType = EventType.SuspicionUpdated,
                    ruleId = ruleId,
                    note = $"{suspicion:0}"
                });
            }

            TryReport(ruleId);
        }

        /// <summary>
        /// 의심 값이 임계 이상일 때 신고를 시도한다.
        /// </summary>
        private void TryReport(string ruleId)
        {
            if (reportManager == null)
            {
                return;
            }

            float now = Time.time;
            if (suspicion < reportThreshold || now - lastReportTimestamp < reportCooldownSeconds)
            {
                return;
            }

            lastReportTimestamp = now;
            reportManager.FileReport(name, ruleId, suspicion);
        }
    }
}


