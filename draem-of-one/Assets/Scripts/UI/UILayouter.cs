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
            TMP_Text toast = null;
            TMP_Text interrogation = null;
            TMP_Text prompt = null;

            foreach (var label in canvas.GetComponentsInChildren<TMP_Text>(true))
            {
                if (label.text == "G 0%")
                {
                    globalLabel = label;
                }
                else if (label.text == "EventLog")
                {
                    eventLog = label;
                }
                else if (label.text == "E: Interact")
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
                globalLabel.fontSize = 22f;
                Place(globalLabel.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(120f, 28f), new Vector2(20f, -20f));
            }

            if (eventLog != null)
            {
                eventLog.name = "EventLogText";
                eventLog.fontSize = 20f;
                eventLog.alignment = TextAlignmentOptions.TopLeft;
                Place(eventLog.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(520f, 160f), new Vector2(20f, -60f));
            }

            if (toast != null)
            {
                toast.name = "ToastText";
                toast.fontSize = 24f;
                toast.alignment = TextAlignmentOptions.Center;
                Place(toast.rectTransform, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(600f, 40f), new Vector2(0f, 80f));
            }

            if (interrogation != null)
            {
                interrogation.name = "InterrogationText";
                interrogation.fontSize = 24f;
                interrogation.alignment = TextAlignmentOptions.Center;
                Place(interrogation.rectTransform, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(680f, 60f), new Vector2(0f, 20f));
            }

            if (prompt != null)
            {
                prompt.name = "PromptText";
                prompt.fontSize = 22f;
                prompt.alignment = TextAlignmentOptions.BottomLeft;
                Place(prompt.rectTransform, new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(260f, 30f), new Vector2(20f, 20f));
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
