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

        private int processedCount = 0;

        private void Update()
        {
            if (eventLog == null || uiManager == null)
            {
                return;
            }

            var events = eventLog.Events;
            for (; processedCount < events.Count; processedCount++)
            {
                var record = events[processedCount];
                string text = semanticShaper != null ? semanticShaper.ToText(record) : record.eventType.ToString();
                uiManager.AddLogLine(text);
            }
        }
    }
}


