#if UNITY_EDITOR
using DreamOfOne.Society;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    /// <summary>
    /// Runs a short decision burst in Play Mode so backend decision metadata is emitted quickly.
    /// </summary>
    public static class BackendTelemetryBurstTool
    {
        private const int DefaultRounds = 4;
        private const int MaxBrainsPerRound = 8;

        [MenuItem("Tools/DreamOfOne/LucidCover/Debug/Run Backend Telemetry Burst")]
        public static void RunBurst()
        {
            if (!EditorApplication.isPlaying)
            {
                Debug.LogWarning("[BackendTelemetryBurst] Enter Play Mode first.");
                return;
            }

            var brains = Object.FindObjectsByType<SocietyBrain>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            if (brains == null || brains.Length == 0)
            {
                Debug.LogWarning("[BackendTelemetryBurst] No SocietyBrain found in active scene.");
                return;
            }

            int totalDispatch = 0;
            for (int round = 0; round < DefaultRounds; round++)
            {
                int dispatchedThisRound = 0;
                for (int i = 0; i < brains.Length && dispatchedThisRound < MaxBrainsPerRound; i++)
                {
                    var brain = brains[i];
                    if (brain == null || !brain.isActiveAndEnabled)
                    {
                        continue;
                    }

                    brain.DebugRunDecisionCycle();
                    dispatchedThisRound++;
                    totalDispatch++;
                }
            }

            Debug.Log($"[BackendTelemetryBurst] Dispatched decision cycles: {totalDispatch}");
        }
    }
}
#endif
