#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;

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

            if (IsTestRunnerScene())
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

        private static bool IsTestRunnerScene()
        {
            var scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                return false;
            }

            if (scene.name.StartsWith("InitTestScene"))
            {
                return true;
            }

            return GameObject.Find("Code-based tests runner") != null;
        }
    }
}
#endif
