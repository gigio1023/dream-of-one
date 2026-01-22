#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    [InitializeOnLoad]
    public static class PlaymodePreflightGate
    {
        private static bool isRunning = false;

        static PlaymodePreflightGate()
        {
            EditorApplication.playModeStateChanged += HandlePlayModeState;
        }

        private static void HandlePlayModeState(PlayModeStateChange state)
        {
            if (state != PlayModeStateChange.ExitingEditMode)
            {
                return;
            }

            if (isRunning)
            {
                return;
            }

            isRunning = true;
            var results = PreflightValidator.Run(true);
            if (results.HasErrors)
            {
                Debug.LogError("[Preflight] Blocking Play Mode due to preflight errors.");
                EditorApplication.isPlaying = false;
            }
            isRunning = false;
        }
    }
}
#endif
