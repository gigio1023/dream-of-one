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
        private float decayPerSecond = 0.5f;

        [SerializeField]
        [Tooltip("신고를 일으킬 최소 의심 수치")]
        private float reportThreshold = 50f;

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

        [SerializeField]
        [Tooltip("NPC 식별자(비워두면 GameObject 이름 사용)")]
        private string npcId = string.Empty;

        private float suspicion = 0f;
        private float lastReportTimestamp = -999f;
        private bool reported = false;
        private string lastEventId = string.Empty;

        public float CurrentSuspicion => suspicion;
        public float CurrentSuspicionNormalized => Mathf.Clamp01(suspicion / Mathf.Max(1f, maxSuspicion));
        public string NpcId => string.IsNullOrEmpty(npcId) ? name : npcId;

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
        public void AddSuspicion(float delta, string ruleId, string eventId = "")
        {
            if (!string.IsNullOrEmpty(eventId) && eventId == lastEventId)
            {
                return;
            }

            lastEventId = eventId;
            suspicion = Mathf.Clamp(suspicion + delta, 0f, maxSuspicion);
            globalSuspicion?.Recalculate();

            if (eventLog != null)
            {
                eventLog.RecordEvent(new EventRecord
                {
                    actorId = NpcId,
                    actorRole = "Citizen",
                    eventType = EventType.SuspicionUpdated,
                    category = EventCategory.Suspicion,
                    ruleId = ruleId,
                    delta = delta,
                    note = $"{suspicion:0}",
                    severity = suspicion >= reportThreshold ? 2 : 0
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
            if (reported || suspicion < reportThreshold || now - lastReportTimestamp < reportCooldownSeconds)
            {
                return;
            }

            lastReportTimestamp = now;
            reported = true;
            reportManager.FileReport(NpcId, ruleId, suspicion, lastEventId);
        }

        public void ResetAfterInterrogation()
        {
            reported = false;
            suspicion = 0f;
            lastReportTimestamp = -999f;
            globalSuspicion?.Recalculate();
        }

        public void Configure(ReportManager report, GlobalSuspicionSystem global, WorldEventLog log)
        {
            reportManager = report;
            globalSuspicion = global;
            eventLog = log;

            if (isActiveAndEnabled && globalSuspicion != null)
            {
                globalSuspicion.Register(this);
            }
        }
    }
}
