using DreamOfOne.Localization;
using DreamOfOne.UI;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// WEL → 가십/신고 → 판정 루프가 1회 이상 발생했는지 자동으로 확인한다.
    /// </summary>
    public sealed class LoopVerifier : MonoBehaviour
    {
        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private UIManager uiManager = null;

        [SerializeField]
        private float windowSeconds = 120f;

        private float violationTime = -999f;
        private float reportTime = -999f;
        private float verdictTime = -999f;
        private bool announced = false;

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }
        }

        private void OnEnable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded += HandleEvent;
            }
        }

        private void OnDisable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded -= HandleEvent;
            }
        }

        private void HandleEvent(EventRecord record)
        {
            if (record == null || announced)
            {
                return;
            }

            float now = Time.time;
            switch (record.eventType)
            {
                case EventType.ViolationDetected:
                    violationTime = now;
                    break;
                case EventType.RumorShared:
                case EventType.ReportFiled:
                    reportTime = now;
                    break;
                case EventType.VerdictGiven:
                    verdictTime = now;
                    break;
            }

            if (IsLoopComplete(now))
            {
                announced = true;
                Debug.Log("[LoopVerifier] WEL→가십/신고→판정 루프 완료");
                uiManager?.ShowToast(LocalizationManager.Text(LocalizationKey.LoopCompleteToast));
            }
        }

        private bool IsLoopComplete(float now)
        {
            if (violationTime < 0f || reportTime < 0f || verdictTime < 0f)
            {
                return false;
            }

            float earliest = Mathf.Min(violationTime, Mathf.Min(reportTime, verdictTime));
            return now - earliest <= windowSeconds;
        }
    }
}
