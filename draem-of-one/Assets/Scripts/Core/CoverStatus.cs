using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Cover 유지 상태를 추적하고 outsiderness 지표를 계산한다.
    /// </summary>
    public sealed class CoverStatus : MonoBehaviour
    {
        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private GlobalSuspicionSystem globalSuspicion = null;

        [SerializeField]
        private CoverProfile coverProfile = null;

        [SerializeField]
        private float outsidernessDecayPerSecond = 1.2f;

        [SerializeField]
        private float violationDelta = 12f;

        [SerializeField]
        private float tabooDelta = 18f;

        [SerializeField]
        private float placeMismatchDelta = 6f;

        [SerializeField]
        private float topicMismatchDelta = 6f;

        private float outsiderness = 0f;
        private float lastActionDelta = 0f;

        public float Outsiderness => outsiderness;
        public float OutsiderProbability { get; private set; }

        public event Action<CoverStatus> OnCoverStatusChanged;

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (globalSuspicion == null)
            {
                globalSuspicion = FindFirstObjectByType<GlobalSuspicionSystem>();
            }

            if (coverProfile == null)
            {
                coverProfile = GetComponent<CoverProfile>();
            }

            if (coverProfile != null && coverProfile.AllowedPlaces.Count == 0)
            {
                coverProfile.Configure(
                    "스튜디오 인턴",
                    "스튜디오",
                    "인턴",
                    new[] { "Studio", "StudioPhoto", "StoreQueue", "ParkSeat", "CafeQueue", "CafeSeat" },
                    new[] { "PROC_NOTE_MISSING", "PROC_APPROVAL_DELAY", "PROC_RC_SKIP" },
                    new[] { "R_QUEUE", "R_LABEL", "R_NOISE" },
                    new[] { "칸반", "패치노트", "RC" });
            }
        }

        private void OnEnable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded += HandleEvent;
            }
        }

        private void OnDisable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded -= HandleEvent;
            }
        }

        private void Update()
        {
            if (outsiderness <= 0f)
            {
                return;
            }

            outsiderness = Mathf.Max(0f, outsiderness - outsidernessDecayPerSecond * Time.deltaTime);
            RecalculateProbability();
        }

        private void HandleEvent(EventRecord record)
        {
            if (record == null || record.actorId != "Player")
            {
                return;
            }

            float delta = 0f;
            if (record.eventType == EventType.ViolationDetected)
            {
                delta += violationDelta;
            }

            if (coverProfile != null)
            {
                if (coverProfile.IsTopicTaboo(record.topic))
                {
                    delta += tabooDelta;
                }

                if (!coverProfile.IsPlaceAllowed(record.placeId))
                {
                    delta += placeMismatchDelta;
                }

                if (!coverProfile.IsTopicAllowed(record.topic))
                {
                    delta += topicMismatchDelta;
                }
            }

            if (delta > 0f)
            {
                ApplyDelta(delta);
            }
        }

        private void ApplyDelta(float delta)
        {
            lastActionDelta = delta;
            outsiderness = Mathf.Clamp(outsiderness + delta, 0f, 100f);
            RecalculateProbability();
        }

        private void RecalculateProbability()
        {
            float g = globalSuspicion != null ? globalSuspicion.GlobalSuspicion : 0f;
            OutsiderProbability = Mathf.Clamp01((outsiderness / 100f) * 0.7f + g * 0.3f);
            OnCoverStatusChanged?.Invoke(this);
        }

        public string BuildStatusLine()
        {
            string coverName = coverProfile != null ? coverProfile.CoverName : "Cover";
            float g = globalSuspicion != null ? globalSuspicion.GlobalSuspicion : 0f;
            return $"Cover:{coverName}  o:{outsiderness:0}  p:{OutsiderProbability:0.00}  G:{g:0.00}";
        }
    }
}
