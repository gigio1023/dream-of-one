using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace DreamOfOne.UI
{
    public sealed class UILayouter : MonoBehaviour
    {
        [SerializeField]
        private Canvas canvas = null;

        [SerializeField]
        private TMP_Text eventLog = null;

        [SerializeField]
        private TMP_Text prompt = null;

        [SerializeField]
        private TMP_Text interrogation = null;

        [SerializeField]
        private TMP_Text caseBundle = null;

        [SerializeField]
        private TMP_Text coverStatus = null;

        [SerializeField]
        private TMP_Text blackboard = null;

        [SerializeField]
        private TMP_Text controls = null;

        [SerializeField]
        private Image promptPanel = null;

        [SerializeField]
        private Image interrogationPanel = null;

        private void Awake()
        {
            ApplyLayout();
        }

        public void ApplyLayout()
        {
            if (canvas == null)
            {
                canvas = GetComponentInChildren<Canvas>(true);
            }

            if (canvas == null)
            {
                return;
            }

            if (eventLog != null)
            {
                eventLog.name = "EventLogText";
                eventLog.fontSize = 28f;
                eventLog.alignment = TextAlignmentOptions.TopLeft;
                eventLog.raycastTarget = false;
                Place(eventLog.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(600f, 240f), new Vector2(20f, -20f));
            }

            if (interrogation != null)
            {
                interrogation.name = "InterrogationText";
                interrogation.fontSize = 28f;
                interrogation.alignment = TextAlignmentOptions.BottomLeft;
                interrogation.raycastTarget = false;
                Place(interrogation.rectTransform, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(800f, 64f), new Vector2(0f, 26f));

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
                blackboard.name = "BlackboardText";
                blackboard.fontSize = 24f;
                blackboard.alignment = TextAlignmentOptions.TopLeft;
                blackboard.raycastTarget = false;
                blackboard.SetText(string.Empty);
                Place(blackboard.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(640f, 220f), new Vector2(20f, -340f));
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
