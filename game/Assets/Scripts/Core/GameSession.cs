using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class GameSession : MonoBehaviour
    {
        [SerializeField]
        private SuspicionManager suspicionManager = null;

        [SerializeField]
        [Range(0f, 1f)]
        private float awarenessEndThreshold = 0.30f;

        [SerializeField]
        private float sessionDurationSeconds = 25f * 60f;

        private float elapsedSeconds = 0f;
        private bool isRunning = true;

        public float ElapsedSeconds => elapsedSeconds;
        public float RemainingSeconds => Mathf.Max(0f, sessionDurationSeconds - elapsedSeconds);
        public bool IsRunning => isRunning;

        private void Update()
        {
            if (!isRunning)
            {
                return;
            }

            elapsedSeconds += Time.deltaTime;

            if (elapsedSeconds >= sessionDurationSeconds)
            {
                EndSession("time_limit");
                return;
            }

            if (suspicionManager != null && suspicionManager.GlobalAwarenessG >= awarenessEndThreshold)
            {
                EndSession("global_awareness_threshold");
            }
        }

        private void EndSession(string reason)
        {
            isRunning = false;
            Debug.Log($"Session ended: {reason}");
            // Hook: trigger UI, results, etc.
        }
    }
}


