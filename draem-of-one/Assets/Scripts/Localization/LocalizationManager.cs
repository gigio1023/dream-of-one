using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

namespace DreamOfOne.Localization
{
    public enum LocalizationLanguage
    {
        Ko,
        En,
        It,
        Zh
    }

    public enum LocalizationKey
    {
        ControlsHint,
        CoverPlaceholder,
        CoverStatusLine,
        ObjectiveAllVisited,
        ObjectiveTarget,
        ObjectiveTargetWithDirection,
        ObjectiveReasonLine,
        ObjectiveRemainingLine,
        ObjectiveReasonStore,
        ObjectiveReasonStudio,
        ObjectiveReasonPark,
        ObjectiveReasonStation,
        LandmarkVisitedToast,
        AllLandmarksVisitedToast,
        GoalPrompt,
        ControlsToast,
        LoopCompleteToast,
        CameraPrompt,
        MissingFontToast,
        BlackboardTitle,
        LanguageChangedToast,
        CaseSummaryTitle,
        CaseSummaryFilterLabel,
        CaseSummaryReportsLabel,
        CaseSummaryViolationsLabel,
        CaseSummaryEvidenceLabel,
        CaseSummaryProceduresLabel,
        CaseSummaryStatementsLabel,
        CaseSummaryExplanationsLabel,
        CaseSummaryRebuttalsLabel,
        CaseSummaryScoreLabel,
        CaseSummaryRulesLabel,
        CaseFilterAll,
        CaseFilterEvidence,
        CaseFilterViolations,
        CaseFilterWitnesses
    }

    [Serializable]
    internal sealed class LocalizationEntry
    {
        public string key = string.Empty;
        public string ko = string.Empty;
        public string en = string.Empty;
        public string it = string.Empty;
        public string zh = string.Empty;
    }

    [Serializable]
    internal sealed class LocalizationTable
    {
        public LocalizationEntry[] entries = Array.Empty<LocalizationEntry>();
    }

    [DefaultExecutionOrder(-400)]
    public sealed class LocalizationManager : MonoBehaviour
    {
        public const string PlayerPrefsKey = "doo.language";
        public const string DefaultResourcePath = "Localization/ui_texts";

        public static LocalizationManager Instance { get; private set; }
        public static event Action LanguageChanged;

        [SerializeField]
        private LocalizationLanguage defaultLanguage = LocalizationLanguage.Ko;

        [SerializeField]
        private string resourcesPath = DefaultResourcePath;

        private LocalizationEntry[] entries = Array.Empty<LocalizationEntry>();
        private Dictionary<LocalizationKey, string> currentTable = new();
        private Dictionary<LocalizationKey, string> fallbackTable = new();

        public LocalizationLanguage CurrentLanguage { get; private set; }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void EnsureInstance()
        {
            if (Instance != null)
            {
                return;
            }

            var host = new GameObject("LocalizationManager");
            DontDestroyOnLoad(host);
            host.AddComponent<LocalizationManager>();
        }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadTables();
            SetLanguage(LoadSavedLanguage(), false);
        }

        public LocalizationLanguage CycleLanguage()
        {
            var values = (LocalizationLanguage[])Enum.GetValues(typeof(LocalizationLanguage));
            int index = Array.IndexOf(values, CurrentLanguage);
            int nextIndex = (index + 1) % values.Length;
            SetLanguage(values[nextIndex]);
            return CurrentLanguage;
        }

        public void SetLanguage(LocalizationLanguage language, bool save = true)
        {
            CurrentLanguage = language;
            currentTable = BuildMap(entries, entry => language switch
            {
                LocalizationLanguage.Ko => entry.ko,
                LocalizationLanguage.En => entry.en,
                LocalizationLanguage.It => entry.it,
                LocalizationLanguage.Zh => entry.zh,
                _ => entry.en
            });

            if (save)
            {
                PlayerPrefs.SetString(PlayerPrefsKey, language.ToString());
                PlayerPrefs.Save();
            }

            LanguageChanged?.Invoke();
        }

        public string Get(LocalizationKey key)
        {
            if (currentTable.TryGetValue(key, out var value) && !string.IsNullOrEmpty(value))
            {
                return value;
            }

            if (fallbackTable.TryGetValue(key, out var fallback) && !string.IsNullOrEmpty(fallback))
            {
                return fallback;
            }

            return key.ToString();
        }

        public string Format(LocalizationKey key, params object[] args)
        {
            string template = Get(key);
            if (args == null || args.Length == 0)
            {
                return template;
            }

            return string.Format(CultureInfo.CurrentCulture, template, args);
        }

        public string GetLanguageDisplayName(LocalizationLanguage language)
        {
            return language switch
            {
                LocalizationLanguage.Ko => "한국어",
                LocalizationLanguage.En => "English",
                LocalizationLanguage.It => "Italiano",
                LocalizationLanguage.Zh => "中文",
                _ => language.ToString()
            };
        }

        public string GetLanguageShortCode(LocalizationLanguage language)
        {
            return language switch
            {
                LocalizationLanguage.Ko => "KO",
                LocalizationLanguage.En => "EN",
                LocalizationLanguage.It => "IT",
                LocalizationLanguage.Zh => "ZH",
                _ => language.ToString().ToUpperInvariant()
            };
        }

        public string GetLanguageListShort()
        {
            return "KO/EN/IT/ZH";
        }

        public static string Text(LocalizationKey key)
        {
            return Instance != null ? Instance.Get(key) : key.ToString();
        }

        public static string Text(LocalizationKey key, params object[] args)
        {
            return Instance != null ? Instance.Format(key, args) : key.ToString();
        }

        private LocalizationLanguage LoadSavedLanguage()
        {
            string saved = PlayerPrefs.GetString(PlayerPrefsKey, defaultLanguage.ToString());
            if (Enum.TryParse(saved, true, out LocalizationLanguage parsed))
            {
                return parsed;
            }

            return defaultLanguage;
        }

        private void LoadTables()
        {
            var asset = Resources.Load<TextAsset>(resourcesPath);
            if (asset == null)
            {
                Debug.LogWarning($"[Localization] Missing resource: {resourcesPath}");
                entries = Array.Empty<LocalizationEntry>();
                fallbackTable = new Dictionary<LocalizationKey, string>();
                return;
            }

            var table = JsonUtility.FromJson<LocalizationTable>(asset.text);
            entries = table?.entries ?? Array.Empty<LocalizationEntry>();
            fallbackTable = BuildMap(entries, entry => entry.en);
        }

        private static Dictionary<LocalizationKey, string> BuildMap(LocalizationEntry[] tableEntries, Func<LocalizationEntry, string> selector)
        {
            var map = new Dictionary<LocalizationKey, string>();
            if (tableEntries == null)
            {
                return map;
            }

            foreach (var entry in tableEntries)
            {
                if (entry == null || string.IsNullOrWhiteSpace(entry.key))
                {
                    continue;
                }

                if (!Enum.TryParse(entry.key, out LocalizationKey key))
                {
                    continue;
                }

                var value = selector(entry);
                if (!string.IsNullOrEmpty(value))
                {
                    map[key] = value;
                }
            }

            return map;
        }
    }
}
