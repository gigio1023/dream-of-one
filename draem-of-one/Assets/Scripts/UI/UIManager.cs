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
        private GlobalSuspicionSystem globalSuspicionSystem = null;

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
        private TMP_Text promptText = null;

        [SerializeField]
        private TMP_Text coverStatusText = null;

        [SerializeField]
        private TMP_Text caseBundleText = null;
        [SerializeField]
        [Tooltip("UI 오브젝트가 없을 때 OnGUI로 표시")]
        private bool useOnGuiFallback = false;

        [SerializeField]
        [Tooltip("UI 로그 패널에 유지할 최대 줄 수")]
        private int logLineCount = 6;

        private readonly Queue<string> logLines = new();
        private Coroutine toastRoutine = null;
        private GlobalSuspicionSystem boundSuspicionSystem = null;
        private CoverStatus coverStatus = null;
        private float targetSuspicion = 0f;
        private float currentSuspicion = 0f;
        private string fallbackToast = string.Empty;
        private float fallbackToastExpire = -1f;
        private bool useFallback = false;
        private GUIStyle fallbackStyle = null;
        private string fallbackPrompt = string.Empty;

        private void Awake()
        {
            ResolveUiReferences();
            if (globalSuspicionSystem == null)
            {
                globalSuspicionSystem = FindFirstObjectByType<GlobalSuspicionSystem>();
            }

            UpdateGlobalSuspicion(0f);
            interrogationText?.SetText(string.Empty);
            promptText?.SetText(string.Empty);
            caseBundleText?.SetText(string.Empty);
            if (caseBundleText != null)
            {
                caseBundleText.gameObject.SetActive(false);
            }
            if (toastText != null)
            {
                toastText.gameObject.SetActive(false);
            }

            useFallback = useOnGuiFallback || (globalSuspicionBar == null && eventLogText == null && toastText == null && interrogationText == null);
            if (useFallback)
            {
                fallbackStyle = new GUIStyle
                {
                    fontSize = 26,
                    normal = { textColor = Color.white }
                };
            }

            Bind(globalSuspicionSystem);
            BindCoverStatus();
        }

        private void Start()
        {
            ResolveUiReferences();
            if (globalSuspicionSystem == null)
            {
                globalSuspicionSystem = FindFirstObjectByType<GlobalSuspicionSystem>();
            }

            if (boundSuspicionSystem == null && globalSuspicionSystem != null)
            {
                Bind(globalSuspicionSystem);
            }

            if (coverStatus == null)
            {
                BindCoverStatus();
            }
        }

        private void ResolveUiReferences()
        {
            if (globalSuspicionBar == null)
            {
                foreach (var slider in GetComponentsInChildren<Slider>(true))
                {
                    if (string.Equals(slider.name, "GlobalSuspicionBar", System.StringComparison.OrdinalIgnoreCase))
                    {
                        globalSuspicionBar = slider;
                        break;
                    }
                }

                if (globalSuspicionBar == null)
                {
                    var sliders = GetComponentsInChildren<Slider>(true);
                    if (sliders.Length > 0)
                    {
                        globalSuspicionBar = sliders[0];
                    }
                }
            }

            if (globalSuspicionLabel == null || eventLogText == null || toastText == null || interrogationText == null || promptText == null)
            {
                var labels = GetComponentsInChildren<TMP_Text>(true);
                foreach (var label in labels)
                {
                    switch (label.name)
                    {
                        case "GlobalSuspicionLabel":
                            globalSuspicionLabel ??= label;
                            break;
                        case "EventLogText":
                            eventLogText ??= label;
                            break;
                        case "ToastText":
                            toastText ??= label;
                            break;
                        case "InterrogationText":
                            interrogationText ??= label;
                            break;
                        case "PromptText":
                            promptText ??= label;
                            break;
                    case "CoverStatusText":
                        coverStatusText ??= label;
                        break;
                    case "CaseBundleText":
                        caseBundleText ??= label;
                        break;
                }
            }

                if (globalSuspicionLabel == null || eventLogText == null || toastText == null || interrogationText == null || promptText == null)
                {
                    foreach (var label in labels)
                    {
                        if (label == globalSuspicionLabel || label == eventLogText || label == toastText || label == interrogationText || label == promptText)
                        {
                            continue;
                        }

                        if (globalSuspicionLabel == null)
                        {
                            globalSuspicionLabel = label;
                            continue;
                        }

                        if (eventLogText == null)
                        {
                            eventLogText = label;
                            continue;
                        }

                        if (toastText == null)
                        {
                            toastText = label;
                            continue;
                        }

                        if (interrogationText == null)
                        {
                            interrogationText = label;
                            continue;
                        }

                        if (promptText == null)
                        {
                            promptText = label;
                            break;
                        }
                    }
                }
            }
        }

        private void Update()
        {
            currentSuspicion = Mathf.Lerp(currentSuspicion, targetSuspicion, 0.25f);
            if (globalSuspicionBar != null)
            {
                globalSuspicionBar.SetValueWithoutNotify(currentSuspicion);
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

            if (boundSuspicionSystem != null)
            {
                boundSuspicionSystem.OnGlobalSuspicionChanged -= UpdateGlobalSuspicion;
            }

            boundSuspicionSystem = system;
            boundSuspicionSystem.OnGlobalSuspicionChanged += UpdateGlobalSuspicion;
            UpdateGlobalSuspicion(boundSuspicionSystem.GlobalSuspicion);
        }

        private void OnDestroy()
        {
            if (boundSuspicionSystem != null)
            {
                boundSuspicionSystem.OnGlobalSuspicionChanged -= UpdateGlobalSuspicion;
            }

            if (coverStatus != null)
            {
                coverStatus.OnCoverStatusChanged -= HandleCoverStatus;
            }
        }

        public void UpdateGlobalSuspicion(float value)
        {
            targetSuspicion = value;
            globalSuspicionLabel?.SetText($"G {value:P0}");
        }

        public void UpdateCoverStatus(string text)
        {
            if (coverStatusText == null)
            {
                return;
            }

            coverStatusText.SetText(text);
        }

        public void ShowCaseBundle(string text)
        {
            if (caseBundleText == null)
            {
                return;
            }

            caseBundleText.gameObject.SetActive(!string.IsNullOrEmpty(text));
            caseBundleText.SetText(text ?? string.Empty);
        }

        private void BindCoverStatus()
        {
            if (coverStatus != null)
            {
                coverStatus.OnCoverStatusChanged -= HandleCoverStatus;
            }

            coverStatus = FindFirstObjectByType<CoverStatus>();
            if (coverStatus == null)
            {
                return;
            }

            coverStatus.OnCoverStatusChanged += HandleCoverStatus;
            UpdateCoverStatus(coverStatus.BuildStatusLine());
        }

        private void HandleCoverStatus(CoverStatus status)
        {
            if (status == null)
            {
                return;
            }

            UpdateCoverStatus(status.BuildStatusLine());
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

            string trimmed = DialogueLineLimiter.ClampLine(text, 80);
            logLines.Enqueue(trimmed);
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
                if (useFallback)
                {
                    fallbackToast = text;
                    fallbackToastExpire = Time.time + duration;
                }

                return;
            }

            if (toastRoutine != null)
            {
                StopCoroutine(toastRoutine);
                toastRoutine = null;
            }

            toastRoutine = StartCoroutine(ToastRoutine(text, duration));
        }

        private IEnumerator ToastRoutine(string text, float duration)
        {
            toastText.gameObject.SetActive(true);
            toastText.SetText(text);
            yield return new WaitForSeconds(duration);
            toastText.gameObject.SetActive(false);
            toastRoutine = null;
        }

        public void ShowInterrogationText(string text)
        {
            interrogationText?.SetText(text);
            if (useFallback)
            {
                // Keep latest interrogation line for fallback render.
                fallbackToast = text;
            }
        }

        public void ShowPrompt(string text)
        {
            if (promptText == null)
            {
                if (useFallback)
                {
                    fallbackPrompt = text;
                }

                return;
            }

            promptText.gameObject.SetActive(true);
            promptText.SetText(text);
        }

        public void HidePrompt()
        {
            if (promptText == null)
            {
                if (useFallback)
                {
                    fallbackPrompt = string.Empty;
                }

                return;
            }

            promptText.gameObject.SetActive(false);
        }

        private void OnGUI()
        {
            if (!useFallback || fallbackStyle == null)
            {
                return;
            }

            float y = 10f;
            GUI.Label(new Rect(10f, y, 400f, 24f), $"G {currentSuspicion:P0}", fallbackStyle);
            y += 26f;

            string logText = string.Join("\n", logLines);
            GUI.Label(new Rect(10f, y, 600f, 140f), logText, fallbackStyle);
            y += 150f;

            if (!string.IsNullOrEmpty(fallbackToast) && Time.time <= fallbackToastExpire)
            {
                GUI.Label(new Rect(10f, y, 600f, 24f), fallbackToast, fallbackStyle);
                y += 26f;
            }

            if (!string.IsNullOrEmpty(fallbackPrompt))
            {
                GUI.Label(new Rect(10f, y, 400f, 24f), fallbackPrompt, fallbackStyle);
            }
        }
    }
}
