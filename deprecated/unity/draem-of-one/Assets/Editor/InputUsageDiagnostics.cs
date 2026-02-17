#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    [InitializeOnLoad]
    public static class InputUsageDiagnostics
    {
        private const string PrefKey = "DreamOfOne.InputUsageChecked";

        static InputUsageDiagnostics()
        {
            EditorApplication.delayCall += Run;
        }

        private static void Run()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                return;
            }

            if (EditorPrefs.GetBool(PrefKey, false))
            {
                return;
            }

            var issues = new List<string>();
            CollectIssues(issues);
            foreach (var issue in issues)
            {
                Debug.LogWarning($"[Diagnostics] {issue}");
            }

            EditorPrefs.SetBool(PrefKey, true);
        }

        public static void CollectIssues(List<string> issues)
        {
            if (issues == null)
            {
                return;
            }

            if (!IsInputSystemOnly())
            {
                return;
            }

            var scriptGuids = AssetDatabase.FindAssets("t:Script", new[] { "Assets/Scripts" });
            foreach (var guid in scriptGuids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (string.IsNullOrEmpty(path) || !path.EndsWith(".cs"))
                {
                    continue;
                }

                string text = File.ReadAllText(path);
                if (!text.Contains("Input.") && !text.Contains("UnityEngine.Input"))
                {
                    continue;
                }

                if (text.Contains("#if ENABLE_INPUT_SYSTEM") || text.Contains("ENABLE_LEGACY_INPUT_MANAGER"))
                {
                    continue;
                }

                issues.Add($"Legacy Input usage without input-system guard: {path}");
            }
        }

        public static bool IsInputSystemOnly()
        {
            var prop = typeof(PlayerSettings).GetProperty("activeInputHandler", BindingFlags.Static | BindingFlags.Public);
            if (prop == null)
            {
                return false;
            }

            object value = prop.GetValue(null);
            if (value == null)
            {
                return false;
            }

            int numeric = (int)value;
            // 0: Old, 1: New, 2: Both
            return numeric == 1;
        }
    }
}
#endif
