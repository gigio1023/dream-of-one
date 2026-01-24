using System.Collections;
using System.Collections.Generic;
using System.Text;
using DreamOfOne.Core;
using DreamOfOne.NPC;
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
        private TMP_Text dialogueText = null;

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
        private TMP_Text artifactText = null;

        [SerializeField]
        private TMP_Text devOverlayText = null;

        [SerializeField]
        private TMP_Text sessionEndText = null;

        [SerializeField]
        private Image sessionEndPanel = null;
        [SerializeField]
        [Tooltip("UI 오브젝트가 없을 때 OnGUI로 표시")]
        private bool useOnGuiFallback = false;

        [SerializeField]
        [Tooltip("UI 로그 패널에 유지할 최대 줄 수")]
        private int logLineCount = 6;

        [SerializeField]
        [Tooltip("대화 로그 패널에 유지할 최대 줄 수")]
        private int dialogueLineCount = 6;

        private readonly Queue<string> logLines = new();
        private readonly Queue<string> dialogueLines = new();
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
        private bool showArtifactPanel = false;
        private bool showDevOverlay = false;
        private bool showLogPanel = true;
        private bool showCasePanel = false;
        private float lastDebugRefresh = -999f;

        [SerializeField]
        [Tooltip("디버그 패널 갱신 간격(초)")]
        private float debugRefreshSeconds = 0.5f;

        private ArtifactSystem artifactSystem = null;
        private PoliceController policeController = null;
        private WorldEventLog eventLog = null;
        private int selectedArtifactIndex = -1;
        private string selectedArtifactId = string.Empty;

        private void Awake()
        {
            ResolveUiReferences();
            EnsureSessionEndUi();
            if (globalSuspicionSystem == null)
            {
                globalSuspicionSystem = FindFirstObjectByType<GlobalSuspicionSystem>();
            }

            UpdateGlobalSuspicion(0f);
            interrogationText?.SetText(string.Empty);
            promptText?.SetText(string.Empty);
            caseBundleText?.SetText(string.Empty);
            dialogueText?.SetText(string.Empty);
            if (caseBundleText != null)
            {
                caseBundleText.gameObject.SetActive(false);
            }
            if (artifactText != null)
            {
                artifactText.SetText(string.Empty);
                artifactText.gameObject.SetActive(false);
            }
            if (devOverlayText != null)
            {
                devOverlayText.SetText(string.Empty);
                devOverlayText.gameObject.SetActive(false);
            }
            if (toastText != null)
            {
                toastText.gameObject.SetActive(false);
            }

            if (sessionEndText != null)
            {
                sessionEndText.gameObject.SetActive(false);
            }
            if (sessionEndPanel != null)
            {
                sessionEndPanel.gameObject.SetActive(false);
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

            artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            policeController = FindFirstObjectByType<PoliceController>();
            eventLog = FindFirstObjectByType<WorldEventLog>();

            if (GetComponent<UIShortcutController>() == null)
            {
                gameObject.AddComponent<UIShortcutController>();
            }
        }

        private void Start()
        {
            ResolveUiReferences();
            EnsureSessionEndUi();
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

            if (artifactSystem == null)
            {
                artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            }

            if (policeController == null)
            {
                policeController = FindFirstObjectByType<PoliceController>();
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }
        }

        private void EnsureSessionEndUi()
        {
            if (sessionEndText != null)
            {
                return;
            }

            var canvas = GetComponentInChildren<Canvas>(true);
            if (canvas == null)
            {
                canvas = FindFirstObjectByType<Canvas>();
            }

            if (canvas == null)
            {
                return;
            }

            foreach (var label in canvas.GetComponentsInChildren<TMP_Text>(true))
            {
                if (label != null && label.name == "SessionEndText")
                {
                    sessionEndText = label;
                    break;
                }
            }

            if (sessionEndText == null)
            {
                var endObject = new GameObject("SessionEndText", typeof(RectTransform), typeof(TextMeshProUGUI));
                endObject.transform.SetParent(canvas.transform, false);
                sessionEndText = endObject.GetComponent<TextMeshProUGUI>();
            }

            if (sessionEndPanel == null)
            {
                foreach (var image in canvas.GetComponentsInChildren<Image>(true))
                {
                    if (image != null && image.name == "SessionEndPanel")
                    {
                        sessionEndPanel = image;
                        break;
                    }
                }
            }

            if (sessionEndPanel == null)
            {
                var panelObject = new GameObject("SessionEndPanel", typeof(RectTransform), typeof(Image));
                panelObject.transform.SetParent(canvas.transform, false);
                sessionEndPanel = panelObject.GetComponent<Image>();
            }

            if (sessionEndPanel != null)
            {
                sessionEndPanel.color = new Color(0f, 0f, 0f, 0.6f);
                var panelRect = sessionEndPanel.rectTransform;
                panelRect.anchorMin = new Vector2(0.5f, 0.5f);
                panelRect.anchorMax = new Vector2(0.5f, 0.5f);
                panelRect.pivot = new Vector2(0.5f, 0.5f);
                panelRect.sizeDelta = new Vector2(960f, 440f);
                panelRect.anchoredPosition = Vector2.zero;
            }

            if (sessionEndText != null)
            {
                sessionEndText.fontSize = 32f;
                sessionEndText.alignment = TextAlignmentOptions.Center;
                sessionEndText.enableWordWrapping = true;
                sessionEndText.raycastTarget = false;

                var rect = sessionEndText.rectTransform;
                rect.anchorMin = new Vector2(0.5f, 0.5f);
                rect.anchorMax = new Vector2(0.5f, 0.5f);
                rect.pivot = new Vector2(0.5f, 0.5f);
                rect.sizeDelta = new Vector2(900f, 380f);
                rect.anchoredPosition = Vector2.zero;
            }

            if (sessionEndPanel != null && sessionEndText != null)
            {
                sessionEndPanel.transform.SetSiblingIndex(sessionEndText.transform.GetSiblingIndex());
                sessionEndText.transform.SetSiblingIndex(sessionEndPanel.transform.GetSiblingIndex() + 1);
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
                        case "DialogueText":
                            dialogueText ??= label;
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
                    case "ArtifactText":
                        artifactText ??= label;
                        break;
                    case "DevOverlayText":
                        devOverlayText ??= label;
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

            if ((showArtifactPanel || showDevOverlay) && Time.time - lastDebugRefresh >= debugRefreshSeconds)
            {
                lastDebugRefresh = Time.time;
                RefreshArtifactPanel();
                RefreshDevOverlay();
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

            if (!string.IsNullOrEmpty(text))
            {
                showCasePanel = true;
            }

            caseBundleText.gameObject.SetActive(showCasePanel && !string.IsNullOrEmpty(text));
            caseBundleText.SetText(text ?? string.Empty);
        }

        public void ToggleCasePanel()
        {
            showCasePanel = !showCasePanel;
            if (caseBundleText != null)
            {
                caseBundleText.gameObject.SetActive(showCasePanel && !string.IsNullOrEmpty(caseBundleText.text));
            }
        }

        public void ToggleArtifactPanel()
        {
            showArtifactPanel = !showArtifactPanel;
            if (artifactText != null)
            {
                artifactText.gameObject.SetActive(showArtifactPanel);
            }
            if (showArtifactPanel && selectedArtifactIndex < 0)
            {
                SelectLatestArtifact();
            }
            RefreshArtifactPanel();
        }

        public void InspectNextArtifact()
        {
            if (artifactSystem == null)
            {
                artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            }

            if (artifactSystem == null)
            {
                return;
            }

            var artifacts = artifactSystem.GetArtifacts();
            if (artifacts.Count == 0)
            {
                selectedArtifactIndex = -1;
                selectedArtifactId = string.Empty;
                return;
            }

            if (!showArtifactPanel && artifactText != null)
            {
                showArtifactPanel = true;
                artifactText.gameObject.SetActive(true);
            }

            selectedArtifactIndex = (selectedArtifactIndex + 1) % artifacts.Count;
            selectedArtifactId = artifacts[selectedArtifactIndex].Id;
            RefreshArtifactPanel();
        }

        public void ToggleDevOverlay()
        {
            showDevOverlay = !showDevOverlay;
            if (devOverlayText != null)
            {
                devOverlayText.gameObject.SetActive(showDevOverlay);
            }
            RefreshDevOverlay();
        }

        public void ToggleLogPanel()
        {
            showLogPanel = !showLogPanel;
            if (eventLogText != null)
            {
                eventLogText.gameObject.SetActive(showLogPanel);
            }
        }

        private void RefreshArtifactPanel()
        {
            if (!showArtifactPanel || artifactText == null)
            {
                return;
            }

            if (artifactSystem == null)
            {
                artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            }

            var builder = new StringBuilder();
            builder.AppendLine("Artifacts");

            if (artifactSystem == null)
            {
                builder.Append("없음");
            }
            else
            {
                var artifacts = artifactSystem.GetArtifacts();
                int count = Mathf.Min(6, artifacts.Count);
                for (int i = 0; i < count; i++)
                {
                    var artifact = artifacts[i];
                    string marker = (i == selectedArtifactIndex) ? ">" : "-";
                    builder.AppendLine($"{marker} {artifact.ArtifactId} [{artifact.PlaceId}] {artifact.Summary}");
                }
                if (artifacts.Count > count)
                {
                    builder.AppendLine($"... +{artifacts.Count - count}");
                }

                if (selectedArtifactIndex >= 0 && selectedArtifactIndex < artifacts.Count)
                {
                    var selected = artifacts[selectedArtifactIndex];
                    builder.AppendLine();
                    builder.AppendLine("Inspect");
                    builder.AppendLine(BuildInspectText(selected));
                }
            }

            artifactText.SetText(builder.ToString());
        }

        private string BuildInspectText(ArtifactRecord record)
        {
            if (string.IsNullOrEmpty(record.Id))
            {
                return string.Empty;
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            string baseText = record.InspectText;
            if (eventLog != null && eventLog.TryGetEventById(record.Id, out var source))
            {
                string detail = $"{source.eventType} {source.actorId} {source.note}";
                if (!string.IsNullOrEmpty(baseText))
                {
                    return $"{baseText}\n{detail}";
                }

                return detail;
            }

            return baseText;
        }

        private void SelectLatestArtifact()
        {
            if (artifactSystem == null)
            {
                artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            }

            if (artifactSystem == null)
            {
                selectedArtifactIndex = -1;
                selectedArtifactId = string.Empty;
                return;
            }

            var artifacts = artifactSystem.GetArtifacts();
            if (artifacts.Count == 0)
            {
                selectedArtifactIndex = -1;
                selectedArtifactId = string.Empty;
                return;
            }

            selectedArtifactIndex = Mathf.Clamp(artifacts.Count - 1, 0, artifacts.Count - 1);
            selectedArtifactId = artifacts[selectedArtifactIndex].Id;
        }

        private void RefreshDevOverlay()
        {
            if (!showDevOverlay || devOverlayText == null)
            {
                return;
            }

            if (policeController == null)
            {
                policeController = FindFirstObjectByType<PoliceController>();
            }

            var builder = new StringBuilder();
            builder.AppendLine("Injected Lines");

            var lines = NpcLogInjector.GetRecentInjectedLines();
            for (int i = 0; i < lines.Count; i++)
            {
                builder.AppendLine(lines[i]);
            }

            builder.AppendLine();
            string reason = policeController != null ? policeController.LastVerdictReason : "N/A";
            builder.Append($"Verdict Reason: {reason}");

            devOverlayText.SetText(builder.ToString());
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

            if (showLogPanel)
            {
                eventLogText.SetText(string.Join("\n", logLines));
            }
        }

        public void AddDialogueLine(string text)
        {
            if (string.IsNullOrEmpty(text))
            {
                return;
            }

            if (dialogueText == null)
            {
                return;
            }

            dialogueLines.Enqueue(text);
            while (dialogueLines.Count > dialogueLineCount)
            {
                dialogueLines.Dequeue();
            }

            dialogueText.SetText(string.Join("\n", dialogueLines));
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

        public void ShowSessionEnd(string text)
        {
            EnsureSessionEndUi();
            if (sessionEndPanel != null)
            {
                sessionEndPanel.gameObject.SetActive(true);
            }

            if (sessionEndText != null)
            {
                sessionEndText.gameObject.SetActive(true);
                sessionEndText.SetText(text ?? string.Empty);
            }
        }

        public void HideSessionEnd()
        {
            if (sessionEndText != null)
            {
                sessionEndText.gameObject.SetActive(false);
                sessionEndText.SetText(string.Empty);
            }

            if (sessionEndPanel != null)
            {
                sessionEndPanel.gameObject.SetActive(false);
            }
        }

        public void ResetUiState()
        {
            logLines.Clear();
            dialogueLines.Clear();
            selectedArtifactIndex = -1;
            selectedArtifactId = string.Empty;
            showArtifactPanel = false;
            showDevOverlay = false;
            showCasePanel = false;
            showLogPanel = true;
            lastDebugRefresh = -999f;
            fallbackToast = string.Empty;
            fallbackToastExpire = -1f;
            fallbackPrompt = string.Empty;

            UpdateGlobalSuspicion(0f);

            if (eventLogText != null)
            {
                eventLogText.SetText(string.Empty);
                eventLogText.gameObject.SetActive(showLogPanel);
            }
            dialogueText?.SetText(string.Empty);
            interrogationText?.SetText(string.Empty);

            if (toastText != null)
            {
                toastText.SetText(string.Empty);
                toastText.gameObject.SetActive(false);
            }

            if (caseBundleText != null)
            {
                caseBundleText.SetText(string.Empty);
                caseBundleText.gameObject.SetActive(false);
            }

            if (artifactText != null)
            {
                artifactText.SetText(string.Empty);
                artifactText.gameObject.SetActive(false);
            }

            if (devOverlayText != null)
            {
                devOverlayText.SetText(string.Empty);
                devOverlayText.gameObject.SetActive(false);
            }

            HidePrompt();
            HideSessionEnd();
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
