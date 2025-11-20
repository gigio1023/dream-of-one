using System.Collections;
using System.Collections.Generic;
using DreamOfOne.Core;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace DreamOfOne.UI
{
    /// <summary>
    /// HUD 요소(전역 G, 이벤트 로그, 토스트, 심문 텍스트)를 담당한다.
    /// 데이터 변환은 EventLogPresenter 등 외부에서 처리하고 여기서는 표현만 수행한다.
    /// </summary>
    public sealed class UIManager : MonoBehaviour
    {
        [SerializeField]
        private Slider globalSuspicionBar = null;

        [SerializeField]
        private TMP_Text globalSuspicionLabel = null;

        [SerializeField]
        private TMP_Text eventLogText = null;

        [SerializeField]
        private TMP_Text toastText = null;

        [SerializeField]
        private TMP_Text interrogationText = null;

        [SerializeField]
        [Tooltip("UI 로그 패널에 유지할 최대 줄 수")]
        private int logLineCount = 5;

        private readonly Queue<string> logLines = new();
        private Coroutine toastRoutine = null;

        private void Awake()
        {
            UpdateGlobalSuspicion(0f);
            interrogationText?.SetText(string.Empty);
            if (toastText != null)
            {
                toastText.gameObject.SetActive(false);
            }
        }

        /// <summary>
        /// GlobalSuspicionSystem을 연결해 실시간으로 G 값 변화를 수신한다.
        /// </summary>
        public void Bind(GlobalSuspicionSystem system)
        {
            if (system == null)
            {
                return;
            }

            system.OnGlobalSuspicionChanged += UpdateGlobalSuspicion;
            UpdateGlobalSuspicion(system.GlobalSuspicion);
        }

        public void UpdateGlobalSuspicion(float value)
        {
            globalSuspicionBar?.SetValueWithoutNotify(value);
            globalSuspicionLabel?.SetText($"G {value:P0}");
        }

        /// <summary>
        /// 새로운 로그 한 줄을 큐에 추가하고 패널을 갱신한다.
        /// </summary>
        public void AddLogLine(string text)
        {
            if (string.IsNullOrEmpty(text))
            {
                return;
            }

            logLines.Enqueue(text);
            while (logLines.Count > logLineCount)
            {
                logLines.Dequeue();
            }

            if (eventLogText == null)
            {
                return;
            }

            eventLogText.SetText(string.Join("\n", logLines));
        }

        /// <summary>
        /// 일정 시간 노출되는 토스트 메시지를 표시한다.
        /// </summary>
        public void ShowToast(string text, float duration = 3f)
        {
            if (toastText == null)
            {
                return;
            }

            if (toastRoutine != null)
            {
                StopCoroutine(toastRoutine);
            }

            toastRoutine = StartCoroutine(ToastRoutine(text, duration));
        }

        private IEnumerator ToastRoutine(string text, float duration)
        {
            toastText.gameObject.SetActive(true);
            toastText.SetText(text);
            yield return new WaitForSeconds(duration);
            toastText.gameObject.SetActive(false);
        }

        public void ShowInterrogationText(string text)
        {
            interrogationText?.SetText(text);
        }
    }
}
