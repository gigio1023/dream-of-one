using DreamOfOne.LucidCover;
using DreamOfOne.UI;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class LucidCoverTextSurfaceDebugMenu
    {
        [MenuItem("Tools/DreamOfOne/LucidCover/Debug/Toggle Dev Overlay (UIManager)")]
        public static void ToggleDevOverlay()
        {
            if (!Application.isPlaying)
            {
                Debug.LogWarning("[LucidCover] Enter Play Mode to toggle dev overlay.");
                return;
            }

            var ui = Object.FindFirstObjectByType<UIManager>();
            if (ui == null)
            {
                Debug.LogWarning("[LucidCover] UIManager not found.");
                return;
            }

            ui.ToggleDevOverlay();
        }

        [MenuItem("Tools/DreamOfOne/LucidCover/Debug/Simulate First TextSurface (SA_BREAK)")]
        public static void SimulateBreak()
        {
            if (!Application.isPlaying)
            {
                Debug.LogWarning("[LucidCover] Enter Play Mode to run TextSurface simulation.");
                return;
            }

            var controller = Object.FindFirstObjectByType<TextSurfaceInteractionController>();
            if (controller == null)
            {
                Debug.LogWarning("[LucidCover] TextSurfaceInteractionController not found.");
                return;
            }

            var surface = Object.FindFirstObjectByType<TextSurface>();
            if (surface == null)
            {
                Debug.LogWarning("[LucidCover] TextSurface not found in scene.");
                return;
            }

            controller.DebugApplyToSurface(surface, SpeechAct.Break);
        }
    }
}
