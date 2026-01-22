#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    [InitializeOnLoad]
    public static class PlaymodeSmokeTestRunner
    {
        private const string PendingKey = "DreamOfOne.PlayTestPending";
        private const string DoneKey = "DreamOfOne.PlayTestDone";

        static PlaymodeSmokeTestRunner()
        {
            EditorApplication.playModeStateChanged += HandleState;
        }

        [MenuItem("Tools/DreamOfOne/Run Playmode Smoke Test")]
        public static void Run()
        {
            var results = PreflightValidator.Run(true);
            if (results.HasErrors)
            {
                Debug.LogError("[PlayTest] Preflight failed. Fix errors before smoke test.");
                return;
            }

            SessionState.SetBool(PendingKey, true);
            SessionState.SetBool(DoneKey, false);
            SessionState.SetInt("DreamOfOne.PlayTestErrors", 0);
            SessionState.SetString("DreamOfOne.PlayTestMessages", string.Empty);
            EditorApplication.EnterPlaymode();
        }

        private static void HandleState(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                if (!SessionState.GetBool(PendingKey, false))
                {
                    return;
                }

                var probe = new GameObject("RuntimeErrorProbe");
                probe.hideFlags = HideFlags.DontSave;
                Object.DontDestroyOnLoad(probe);
                probe.AddComponent<DreamOfOne.Core.RuntimeErrorProbe>();
            }

            if (state == PlayModeStateChange.EnteredEditMode)
            {
                if (!SessionState.GetBool(PendingKey, false))
                {
                    return;
                }

                SessionState.SetBool(PendingKey, false);

                int errors = SessionState.GetInt("DreamOfOne.PlayTestErrors", 0);
                string messages = SessionState.GetString("DreamOfOne.PlayTestMessages", string.Empty);

                if (errors > 0)
                {
                    Debug.LogError($"[PlayTest] Errors={errors}. Sample:{messages}");
                }
                else
                {
                    Debug.Log("[PlayTest] OK: no runtime errors detected.");
                }
            }
        }
    }
}
#endif
