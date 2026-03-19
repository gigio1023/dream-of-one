#if UNITY_EDITOR
using DreamOfOne.Core;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class WELReplayMenu
    {
        [MenuItem("Tools/DreamOfOne/Replay WEL From Last Log")]
        public static void ReplayFromLastLog()
        {
            var log = Object.FindFirstObjectByType<WorldEventLog>();
            if (log == null)
            {
                Debug.LogWarning("[WELReplay] WorldEventLog not found in scene.");
                return;
            }

            var runner = Object.FindFirstObjectByType<WELReplayRunner>();
            if (runner == null)
            {
                var host = new GameObject("WELReplayRunner");
                runner = host.AddComponent<WELReplayRunner>();
            }

            runner.ReplayFromFile(log.LogFilePath, speed: 1f, clear: false);
        }
    }
}
#endif
