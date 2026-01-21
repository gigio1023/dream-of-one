using DreamOfOne.UI;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// WorldEventLog를 감시하여 신규 이벤트를 UI 로그로 전달한다.
    /// UIManager의 책임을 표현 영역으로 한정하기 위한 브릿지 역할이다.
    /// </summary>
    public sealed class EventLogPresenter : MonoBehaviour
    {
        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private SemanticShaper semanticShaper = null;

        [SerializeField]
        private UIManager uiManager = null;

        [SerializeField]
        [Tooltip("프레임당 처리할 최대 이벤트 수")]
        private int maxEventsPerFrame = 2;

        /// <summary>
        /// WorldEventLog의 총 발행 카운터를 기억해 버퍼 회전 후에도 신규 이벤트를 감지한다.
        /// </summary>
        private int lastProcessedTotal = 0;

        public void Configure(WorldEventLog log, SemanticShaper shaper, UIManager manager)
        {
            eventLog = log;
            semanticShaper = shaper;
            uiManager = manager;
        }

        private void Update()
        {
            if (eventLog == null || uiManager == null)
            {
                return;
            }

            var events = eventLog.Events;
            int total = eventLog.TotalEvents;
            int dropped = eventLog.DroppedEvents;

            // 앞에서 드롭된 수만큼 오프셋을 줄여 현재 버퍼 인덱스를 계산한다.
            int startIndex = Mathf.Max(0, lastProcessedTotal - dropped);
            if (startIndex > events.Count)
            {
                startIndex = events.Count;
            }

            int processed = 0;
            for (int i = startIndex; i < events.Count; i++)
            {
                var record = events[i];
                string text = semanticShaper != null ? semanticShaper.ToText(record) : record.eventType.ToString();
                uiManager.AddLogLine(text);

                if (record.severity >= 2 || record.eventType == EventType.VerdictGiven)
                {
                    uiManager.ShowToast(text);
                }

                processed++;
                if (processed >= maxEventsPerFrame)
                {
                    break;
                }
            }

            lastProcessedTotal = Mathf.Min(total, lastProcessedTotal + processed);
        }
    }
}
