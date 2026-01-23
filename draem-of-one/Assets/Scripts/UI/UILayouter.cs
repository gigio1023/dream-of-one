using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace DreamOfOne.UI
{
    /// <summary>
    /// Simple runtime layout for HUD elements created in Prototype scene.
    /// </summary>
    public sealed class UILayouter : MonoBehaviour
    {
        [SerializeField]
        private bool applyOnAwake = true;

        [SerializeField]
        [Tooltip("추가 HUD(컨트롤/커버/케이스/블랙보드) 표시 여부")]
        private bool showExtendedHud = false;

        private void Awake()
        {
            if (applyOnAwake)
            {
                Apply();
            }
        }

        public void Apply()
        {
            var canvas = GetComponentInChildren<Canvas>(true);
            if (canvas == null)
            {
                return;
            }

            var scaler = canvas.GetComponent<CanvasScaler>();
            if (scaler != null)
            {
                scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                scaler.referenceResolution = new Vector2(1920f, 1080f);
                scaler.matchWidthOrHeight = 0.5f;
            }

            var slider = canvas.GetComponentInChildren<Slider>(true);
            if (slider != null)
            {
                slider.name = "GlobalSuspicionBar";
                Place(slider.GetComponent<RectTransform>(), new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(160f, 20f), new Vector2(140f, -20f));
                slider.minValue = 0f;
                slider.maxValue = 1f;
                slider.value = 0f;
            }

            TMP_Text globalLabel = null;
            TMP_Text eventLog = null;
            TMP_Text dialogue = null;
            TMP_Text toast = null;
            TMP_Text interrogation = null;
            TMP_Text prompt = null;
            TMP_Text controls = null;
            TMP_Text coverStatus = null;
            TMP_Text caseBundle = null;
            TMP_Text blackboard = null;
            TMP_Text artifact = null;
            TMP_Text devOverlay = null;
            Image eventLogPanel = null;
            Image dialoguePanel = null;
            Image promptPanel = null;
            Image interrogationPanel = null;
            Image toastPanel = null;

            foreach (var image in canvas.GetComponentsInChildren<Image>(true))
            {
                if (image.name == "EventLogPanel")
                {
                    eventLogPanel = image;
                }
                else if (image.name == "DialoguePanel")
                {
                    dialoguePanel = image;
                }
                else if (image.name == "PromptPanel")
                {
                    promptPanel = image;
                }
                else if (image.name == "InterrogationPanel")
                {
                    interrogationPanel = image;
                }
                else if (image.name == "ToastPanel")
                {
                    toastPanel = image;
                }
            }

            foreach (var label in canvas.GetComponentsInChildren<TMP_Text>(true))
            {
                switch (label.name)
                {
                    case "GlobalSuspicionLabel":
                        globalLabel ??= label;
                        break;
                    case "EventLogText":
                        eventLog ??= label;
                        break;
                    case "DialogueText":
                        dialogue ??= label;
                        break;
                    case "PromptText":
                        prompt ??= label;
                        break;
                    case "ControlsText":
                        controls ??= label;
                        break;
                    case "CoverStatusText":
                        coverStatus ??= label;
                        break;
                    case "CaseBundleText":
                        caseBundle ??= label;
                        break;
                    case "BlackboardText":
                        blackboard ??= label;
                        break;
                    case "ArtifactText":
                        artifact ??= label;
                        break;
                    case "DevOverlayText":
                        devOverlay ??= label;
                        break;
                }
            }

            foreach (var label in canvas.GetComponentsInChildren<TMP_Text>(true))
            {
                if (globalLabel == null && label.text == "G 0%")
                {
                    globalLabel = label;
                }
                else if (eventLog == null && label.text == "EventLog")
                {
                    eventLog = label;
                }
                else if (dialogue == null && label.text == "Dialogue")
                {
                    dialogue = label;
                }
                else if (prompt == null && label.text == "E: Interact")
                {
                    prompt = label;
                }
            }

            var remaining = new System.Collections.Generic.List<TMP_Text>();
            foreach (var label in canvas.GetComponentsInChildren<TMP_Text>(true))
            {
                if (label == globalLabel || label == eventLog || label == prompt)
                {
                    continue;
                }
                remaining.Add(label);
            }

            if (remaining.Count > 0)
            {
                toast = remaining[0];
            }
            if (remaining.Count > 1)
            {
                interrogation = remaining[1];
            }

            if (globalLabel != null)
            {
                globalLabel.name = "GlobalSuspicionLabel";
                globalLabel.fontSize = 34f;
                globalLabel.raycastTarget = false;
                Place(globalLabel.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(120f, 28f), new Vector2(20f, -20f));
            }

            if (eventLog != null)
            {
                eventLog.name = "EventLogText";
                eventLog.fontSize = 26f;
                eventLog.alignment = TextAlignmentOptions.TopLeft;
                eventLog.raycastTarget = false;
                Place(eventLog.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(600f, 220f), new Vector2(20f, -70f));

                if (eventLogPanel == null)
                {
                    var panelObject = new GameObject("EventLogPanel", typeof(RectTransform), typeof(Image));
                    panelObject.transform.SetParent(canvas.transform, false);
                    eventLogPanel = panelObject.GetComponent<Image>();
                }

                if (eventLogPanel != null)
                {
                    eventLogPanel.color = new Color(0f, 0f, 0f, 0.45f);
                    var panelRect = eventLogPanel.rectTransform;
                    Place(panelRect, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(620f, 240f), new Vector2(20f, -70f));
                    eventLogPanel.transform.SetSiblingIndex(eventLog.transform.GetSiblingIndex());
                    eventLog.transform.SetSiblingIndex(eventLogPanel.transform.GetSiblingIndex() + 1);
                }
            }

            if (dialogue == null)
            {
                var dialogueObject = new GameObject("DialogueText", typeof(RectTransform), typeof(TextMeshProUGUI));
                dialogueObject.transform.SetParent(canvas.transform, false);
                dialogue = dialogueObject.GetComponent<TextMeshProUGUI>();
            }

            if (dialogue != null)
            {
                dialogue.name = "DialogueText";
                dialogue.fontSize = 24f;
                dialogue.alignment = TextAlignmentOptions.TopLeft;
                dialogue.raycastTarget = false;
                Place(dialogue.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(600f, 140f), new Vector2(20f, -320f));

                if (dialoguePanel == null)
                {
                    var panelObject = new GameObject("DialoguePanel", typeof(RectTransform), typeof(Image));
                    panelObject.transform.SetParent(canvas.transform, false);
                    dialoguePanel = panelObject.GetComponent<Image>();
                }

                if (dialoguePanel != null)
                {
                    dialoguePanel.color = new Color(0f, 0f, 0f, 0.35f);
                    var panelRect = dialoguePanel.rectTransform;
                    Place(panelRect, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(620f, 160f), new Vector2(20f, -320f));
                    dialoguePanel.transform.SetSiblingIndex(dialogue.transform.GetSiblingIndex());
                    dialogue.transform.SetSiblingIndex(dialoguePanel.transform.GetSiblingIndex() + 1);
                }
            }

            if (toast != null)
            {
                toast.name = "ToastText";
                toast.fontSize = 34f;
                toast.alignment = TextAlignmentOptions.Center;
                toast.raycastTarget = false;
                Place(toast.rectTransform, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(680f, 50f), new Vector2(0f, 90f));

                if (toastPanel == null)
                {
                    var panelObject = new GameObject("ToastPanel", typeof(RectTransform), typeof(Image));
                    panelObject.transform.SetParent(canvas.transform, false);
                    toastPanel = panelObject.GetComponent<Image>();
                }

                if (toastPanel != null)
                {
                    toastPanel.color = new Color(0f, 0f, 0f, 0.35f);
                    var panelRect = toastPanel.rectTransform;
                    Place(panelRect, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(720f, 60f), new Vector2(0f, 90f));
                    toastPanel.transform.SetSiblingIndex(toast.transform.GetSiblingIndex());
                    toast.transform.SetSiblingIndex(toastPanel.transform.GetSiblingIndex() + 1);
                }
            }

            if (interrogation != null)
            {
                interrogation.name = "InterrogationText";
                interrogation.fontSize = 32f;
                interrogation.alignment = TextAlignmentOptions.Center;
                interrogation.raycastTarget = false;
                Place(interrogation.rectTransform, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(760f, 70f), new Vector2(0f, 24f));

                if (interrogationPanel == null)
                {
                    var panelObject = new GameObject("InterrogationPanel", typeof(RectTransform), typeof(Image));
                    panelObject.transform.SetParent(canvas.transform, false);
                    interrogationPanel = panelObject.GetComponent<Image>();
                }

                if (interrogationPanel != null)
                {
                    interrogationPanel.color = new Color(0f, 0f, 0f, 0.4f);
                    var panelRect = interrogationPanel.rectTransform;
                    Place(panelRect, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(800f, 80f), new Vector2(0f, 24f));
                    interrogationPanel.transform.SetSiblingIndex(interrogation.transform.GetSiblingIndex());
                    interrogation.transform.SetSiblingIndex(interrogationPanel.transform.GetSiblingIndex() + 1);
                }
            }

            if (prompt != null)
            {
                prompt.name = "PromptText";
                prompt.fontSize = 34f;
                prompt.alignment = TextAlignmentOptions.BottomLeft;
                prompt.raycastTarget = false;
                Place(prompt.rectTransform, new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(360f, 44f), new Vector2(20f, 26f));

                if (promptPanel == null)
                {
                    var panelObject = new GameObject("PromptPanel", typeof(RectTransform), typeof(Image));
                    panelObject.transform.SetParent(canvas.transform, false);
                    promptPanel = panelObject.GetComponent<Image>();
                }

                if (promptPanel != null)
                {
                    promptPanel.color = new Color(0f, 0f, 0f, 0.35f);
                    var panelRect = promptPanel.rectTransform;
                    Place(panelRect, new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(380f, 50f), new Vector2(20f, 26f));
                    promptPanel.transform.SetSiblingIndex(prompt.transform.GetSiblingIndex());
                    prompt.transform.SetSiblingIndex(promptPanel.transform.GetSiblingIndex() + 1);
                }
            }

            if (controls == null)
            {
                var controlObject = new GameObject("ControlsText", typeof(RectTransform), typeof(TextMeshProUGUI));
                controlObject.transform.SetParent(canvas.transform, false);
                controls = controlObject.GetComponent<TextMeshProUGUI>();
            }

            if (controls != null)
            {
                controls.gameObject.SetActive(showExtendedHud);
            }

            if (controls != null && showExtendedHud)
            {
                controls.name = "ControlsText";
                controls.fontSize = 30f;
                controls.alignment = TextAlignmentOptions.BottomRight;
                controls.raycastTarget = false;
                controls.SetText("WASD 이동 / E 상호작용 / F 촬영");
                Place(controls.rectTransform, new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(480f, 40f), new Vector2(-20f, 26f));
            }

            if (coverStatus == null)
            {
                var coverObject = new GameObject("CoverStatusText", typeof(RectTransform), typeof(TextMeshProUGUI));
                coverObject.transform.SetParent(canvas.transform, false);
                coverStatus = coverObject.GetComponent<TextMeshProUGUI>();
            }

            if (coverStatus != null)
            {
                coverStatus.gameObject.SetActive(showExtendedHud);
            }

            if (coverStatus != null && showExtendedHud)
            {
                coverStatus.name = "CoverStatusText";
                coverStatus.fontSize = 30f;
                coverStatus.alignment = TextAlignmentOptions.TopRight;
                coverStatus.raycastTarget = false;
                coverStatus.SetText("Cover: -");
                Place(coverStatus.rectTransform, new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(460f, 40f), new Vector2(-20f, -76f));
            }

            if (caseBundle == null)
            {
                var bundleObject = new GameObject("CaseBundleText", typeof(RectTransform), typeof(TextMeshProUGUI));
                bundleObject.transform.SetParent(canvas.transform, false);
                caseBundle = bundleObject.GetComponent<TextMeshProUGUI>();
            }

            if (caseBundle != null)
            {
                caseBundle.gameObject.SetActive(showExtendedHud);
            }

            if (caseBundle != null && showExtendedHud)
            {
                caseBundle.name = "CaseBundleText";
                caseBundle.fontSize = 26f;
                caseBundle.alignment = TextAlignmentOptions.TopRight;
                caseBundle.raycastTarget = false;
                caseBundle.SetText(string.Empty);
                Place(caseBundle.rectTransform, new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(460f, 200f), new Vector2(-20f, -140f));
            }

            if (blackboard == null)
            {
                var boardObject = new GameObject("BlackboardText", typeof(RectTransform), typeof(TextMeshProUGUI));
                boardObject.transform.SetParent(canvas.transform, false);
                blackboard = boardObject.GetComponent<TextMeshProUGUI>();
            }

            if (blackboard != null)
            {
                blackboard.gameObject.SetActive(showExtendedHud);
            }

            if (blackboard != null && showExtendedHud)
            {
                blackboard.name = "BlackboardText";
                blackboard.fontSize = 24f;
                blackboard.alignment = TextAlignmentOptions.TopLeft;
                blackboard.raycastTarget = false;
                blackboard.SetText(string.Empty);
                Place(blackboard.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(640f, 220f), new Vector2(20f, -340f));
            }

            if (artifact == null)
            {
                var artifactObject = new GameObject("ArtifactText", typeof(RectTransform), typeof(TextMeshProUGUI));
                artifactObject.transform.SetParent(canvas.transform, false);
                artifact = artifactObject.GetComponent<TextMeshProUGUI>();
            }

            if (artifact != null)
            {
                artifact.gameObject.SetActive(showExtendedHud);
            }

            if (artifact != null && showExtendedHud)
            {
                artifact.name = "ArtifactText";
                artifact.fontSize = 24f;
                artifact.alignment = TextAlignmentOptions.TopRight;
                artifact.raycastTarget = false;
                artifact.SetText(string.Empty);
                Place(artifact.rectTransform, new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(420f, 200f), new Vector2(-20f, 140f));
            }

            if (devOverlay == null)
            {
                var devObject = new GameObject("DevOverlayText", typeof(RectTransform), typeof(TextMeshProUGUI));
                devObject.transform.SetParent(canvas.transform, false);
                devOverlay = devObject.GetComponent<TextMeshProUGUI>();
            }

            if (devOverlay != null)
            {
                devOverlay.gameObject.SetActive(showExtendedHud);
            }

            if (devOverlay != null && showExtendedHud)
            {
                devOverlay.name = "DevOverlayText";
                devOverlay.fontSize = 22f;
                devOverlay.alignment = TextAlignmentOptions.TopLeft;
                devOverlay.raycastTarget = false;
                devOverlay.SetText(string.Empty);
                Place(devOverlay.rectTransform, new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(620f, 200f), new Vector2(20f, 140f));
            }
        }

        private static void Place(RectTransform rect, Vector2 anchorMin, Vector2 anchorMax, Vector2 size, Vector2 anchoredPos)
        {
            if (rect == null)
            {
                return;
            }

            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = anchoredPos;
        }
    }
}
