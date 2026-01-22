#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class CLIRunner
    {
        private const string PendingKey = "DreamOfOne.PlayTestPending";
        private const string DoneKey = "DreamOfOne.PlayTestDone";
        private const string ErrorCountKey = "DreamOfOne.PlayTestErrors";
        private const string ErrorMessagesKey = "DreamOfOne.PlayTestMessages";
        private const double SmokeTimeoutSeconds = 25.0;

        private static double smokeStartTime = 0.0;

        public static void RunEditorDiagnostics()
        {
            var results = PreflightValidator.Run(true);
            if (results.HasErrors)
            {
                Debug.LogError($"[CLI] Preflight failed. Errors={results.errors.Count}.");
                EditorApplication.Exit(1);
                return;
            }

            Debug.Log("[CLI] Preflight OK.");
            EditorApplication.Exit(0);
        }

        public static void RunPlaymodeSmokeTest()
        {
            var preflight = PreflightValidator.Run(true);
            if (preflight.HasErrors)
            {
                Debug.LogError($"[CLI] Preflight failed. Errors={preflight.errors.Count}.");
                EditorApplication.Exit(1);
                return;
            }

            SessionState.SetBool(PendingKey, true);
            SessionState.SetBool(DoneKey, false);
            SessionState.SetInt(ErrorCountKey, 0);
            SessionState.SetString(ErrorMessagesKey, string.Empty);

            smokeStartTime = EditorApplication.timeSinceStartup;
            EditorApplication.update += PollPlaymode;
            EditorApplication.EnterPlaymode();
        }

        private static void PollPlaymode()
        {
            if (!SessionState.GetBool(PendingKey, false))
            {
                EditorApplication.update -= PollPlaymode;
                return;
            }

            if (SessionState.GetBool(DoneKey, false))
            {
                FinishPlaymode();
                return;
            }

            if (EditorApplication.timeSinceStartup - smokeStartTime > SmokeTimeoutSeconds)
            {
                Debug.LogError("[CLI] Playmode smoke test timed out.");
                SessionState.SetBool(PendingKey, false);
                EditorApplication.update -= PollPlaymode;
                EditorApplication.Exit(2);
            }
        }

        private static void FinishPlaymode()
        {
            EditorApplication.update -= PollPlaymode;
            SessionState.SetBool(PendingKey, false);

            int errors = SessionState.GetInt(ErrorCountKey, 0);
            string messages = SessionState.GetString(ErrorMessagesKey, string.Empty);

            if (errors > 0)
            {
                Debug.LogError($"[CLI] Playmode smoke test failed. Errors={errors}. Sample:{messages}");
                EditorApplication.Exit(1);
                return;
            }

            Debug.Log("[CLI] Playmode smoke test OK.");
            EditorApplication.Exit(0);
        }
    }
}
#endif
