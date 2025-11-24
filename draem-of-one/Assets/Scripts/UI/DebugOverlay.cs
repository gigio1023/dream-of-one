using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class DebugOverlay : MonoBehaviour
    {
        [SerializeField]
        private SuspicionManager suspicionManager = null;

        private GUIStyle style;

        private void Awake()
        {
            style = new GUIStyle
            {
                fontSize = 16,
                normal = { textColor = Color.white }
            };
        }

        private void OnGUI()
        {
            if (suspicionManager == null)
            {
                return;
            }

            float g = suspicionManager.GlobalAwarenessG;
            GUI.Label(new Rect(10, 10, 400, 24), $"Global Awareness G: {g:0.00}", style);
        }
    }
}


