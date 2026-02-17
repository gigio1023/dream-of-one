using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Global Exposure (0-100). Deterministic state; any changes are recorded to WEL.
    /// </summary>
    public sealed class ExposureSystem : MonoBehaviour
    {
        public event Action<int> OnExposureChanged;

        [SerializeField]
        private int attentionThreshold = 60;

        [SerializeField]
        private int exposedThreshold = 100;

        [SerializeField]
        private int maxExposure = 100;

        [SerializeField]
        private WorldEventLog eventLog = null;

        private int exposure = 0;

        public int Exposure => exposure;
        public int AttentionThreshold => attentionThreshold;
        public int ExposedThreshold => exposedThreshold;
        public bool HasStationAttention => exposure >= attentionThreshold;
        public bool IsExposed => exposure >= exposedThreshold;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureSystem()
        {
            if (FindFirstObjectByType<ExposureSystem>() != null)
            {
                return;
            }

            var host = new GameObject("ExposureSystem");
            host.AddComponent<ExposureSystem>();
        }

        private void Awake()
        {
            maxExposure = Mathf.Max(1, maxExposure);
            exposedThreshold = Mathf.Clamp(exposedThreshold, 1, maxExposure);
            attentionThreshold = Mathf.Clamp(attentionThreshold, 0, exposedThreshold);

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }
        }

        public void ResetExposure()
        {
            SetExposure(0, recordEvent: false, actorId: "System", placeId: string.Empty, lawId: string.Empty, detectorId: string.Empty);
        }

        public void AddExposure(int delta, string actorId, string placeId, string lawId, string detectorId, Vector3 position)
        {
            if (delta == 0)
            {
                return;
            }

            int next = Mathf.Clamp(exposure + delta, 0, maxExposure);
            if (next == exposure)
            {
                return;
            }

            SetExposure(next, recordEvent: true, actorId: actorId, placeId: placeId, lawId: lawId, detectorId: detectorId, delta: delta, position: position);
        }

        private void SetExposure(
            int value,
            bool recordEvent,
            string actorId,
            string placeId,
            string lawId,
            string detectorId,
            int delta = 0,
            Vector3 position = default)
        {
            exposure = Mathf.Clamp(value, 0, maxExposure);
            OnExposureChanged?.Invoke(exposure);

            if (!recordEvent || eventLog == null)
            {
                return;
            }

            var record = new EventRecord
            {
                actorId = string.IsNullOrEmpty(actorId) ? "System" : actorId,
                actorRole = "System",
                targetId = "PLAYER",
                eventType = EventType.ExposureUpdated,
                category = EventCategory.Exposure,
                ruleId = lawId ?? string.Empty,
                topic = string.IsNullOrEmpty(lawId) ? "Exposure" : lawId,
                sourceId = detectorId ?? string.Empty,
                delta = delta,
                note = $"{exposure}",
                severity = exposure >= attentionThreshold ? 2 : 1,
                placeId = placeId ?? string.Empty,
                position = position
            };

            eventLog.RecordEvent(record);
        }
    }
}

