using System.Collections.Generic;
using DreamOfOne.Core;
using DreamOfOne.NPC;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace DreamOfOne.UI
{
    public sealed class UIManager : MonoBehaviour
    {
        [SerializeField]
        private Slider globalSuspicionBar = null;

        [SerializeField]
        private TMP_Text eventLogText = null;

        [SerializeField]
        private TMP_Text toastText = null;

        [SerializeField]
        private TMP_Text interrogationText = null;

        [SerializeField]
        private TMP_Text promptText = null;

        [SerializeField]
        private TMP_Text caseBundleText = null;

        [SerializeField]
        private TMP_Text coverStatus = null;

        [SerializeField]
        private bool useOnGuiFallback = false;

        private bool useFallback = false;
        private GUIStyle fallbackStyle = null;
        private readonly Queue<string> toastQueue = new();
        private float toastTimer = 0f;
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
                    if (slider.name.Contains("GlobalSuspicion"))
                    {
                        globalSuspicionBar = slider;
                        break;
                    }
                }
            }

            if (eventLogText == null)
            {
                eventLogText = FindText("EventLogText");
            }

            if (toastText == null)
            {
                toastText = FindText("ToastText");
            }

            if (interrogationText == null)
            {
                interrogationText = FindText("InterrogationText");
            }

            if (promptText == null)
            {
                promptText = FindText("PromptText");
            }

            if (caseBundleText == null)
            {
                caseBundleText = FindText("CaseBundleText");
            }

            if (coverStatus == null)
            {
                coverStatus = FindText("CoverStatusText");
            }
        }

        private TMP_Text FindText(string name)
        {
            foreach (var text in GetComponentsInChildren<TMP_Text>(true))
            {
                if (text != null && text.name == name)
                {
                    return text;
                }
            }

            return null;
        }

        private GlobalSuspicionSystem boundSuspicionSystem = null;
        private float lastToastTime = 0f;

        public void Bind(GlobalSuspicionSystem system)
        {
            if (system == null)
            {
                return;
            }

            boundSuspicionSystem = system;
            system.OnSuspicionChanged += UpdateGlobalSuspicion;
            UpdateGlobalSuspicion(system.CurrentSuspicion);
        }

        private void OnDestroy()
        {
            if (boundSuspicionSystem != null)
            {
                boundSuspicionSystem.OnSuspicionChanged -= UpdateGlobalSuspicion;
            }
        }

        public void UpdateGlobalSuspicion(float value)
        {
            if (globalSuspicionBar != null)
            {
                globalSuspicionBar.value = value;
            }
        }

        public void UpdateEventLog(string text)
        {
            if (eventLogText != null)
            {
                eventLogText.SetText(text);
            }
            else
            {
                fallbackPrompt = text;
            }
        }

        public void ShowToast(string text)
        {
            if (string.IsNullOrEmpty(text))
            {
                return;
            }

            toastQueue.Enqueue(text);
            if (toastText != null)
            {
                toastText.gameObject.SetActive(true);
            }
        }

        public void UpdateInterrogation(string text)
        {
            if (interrogationText != null)
            {
                interrogationText.SetText(text);
            }
        }

        public void UpdatePrompt(string text)
        {
            if (promptText != null)
            {
                promptText.SetText(text);
            }
            else
            {
                fallbackPrompt = text;
            }
        }

        public void UpdateCaseBundle(string text)
        {
            if (caseBundleText != null)
            {
                caseBundleText.SetText(text);
                caseBundleText.gameObject.SetActive(!string.IsNullOrEmpty(text));
            }
        }

        public void UpdateCoverStatus(string text)
        {
            if (coverStatus != null)
            {
                coverStatus.SetText(text);
            }
        }

        private void Update()
        {
            UpdateToastQueue();
        }

        private void UpdateToastQueue()
        {
            if (toastQueue.Count == 0)
            {
                if (toastText != null)
                {
                    toastText.gameObject.SetActive(false);
                }

                return;
            }

            if (Time.time - lastToastTime < 2f)
            {
                return;
            }

            if (toastText != null)
            {
                toastText.gameObject.SetActive(true);
                toastText.SetText(toastQueue.Dequeue());
                lastToastTime = Time.time;
            }
        }

        private void OnGUI()
        {
            if (!useFallback || fallbackStyle == null)
            {
                return;
            }

            GUILayout.BeginArea(new Rect(10, 10, 700, 600));
            GUILayout.Label(fallbackPrompt, fallbackStyle);
            GUILayout.EndArea();
        }

        private void BindCoverStatus()
        {
            var profile = FindFirstObjectByType<CoverProfile>();
            if (profile != null)
            {
                UpdateCoverStatus($"Cover: {profile.CoverName}");
            }
        }
    }
}
