using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Drives deterministic pressure phases across the session timeline.
    /// </summary>
    public sealed class SessionArcDirector : MonoBehaviour
    {
        [Serializable]
        public struct ArcPhaseConfig
        {
            public string phaseId;
            [Range(0f, 1f)]
            public float startRatio;
            public float suspicionDeltaMultiplier;
            public int reportsRequired;
            [Range(0f, 1f)]
            public float globalSuspicionThreshold;
            [Range(0f, 1f)]
            public float socialPressureThreshold;
        }

        [SerializeField]
        private SessionDirector sessionDirector = null;

        [SerializeField]
        private ViolationResponseSystem violationResponseSystem = null;

        [SerializeField]
        private ReportManager reportManager = null;

        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private ArcPhaseConfig[] phaseConfigs = new[]
        {
            new ArcPhaseConfig
            {
                phaseId = "baseline",
                startRatio = 0f,
                suspicionDeltaMultiplier = 1f,
                reportsRequired = 2,
                globalSuspicionThreshold = 0.20f,
                socialPressureThreshold = 0.60f
            },
            new ArcPhaseConfig
            {
                phaseId = "pressure",
                startRatio = 0.35f,
                suspicionDeltaMultiplier = 1.15f,
                reportsRequired = 2,
                globalSuspicionThreshold = 0.18f,
                socialPressureThreshold = 0.55f
            },
            new ArcPhaseConfig
            {
                phaseId = "critical",
                startRatio = 0.75f,
                suspicionDeltaMultiplier = 1.35f,
                reportsRequired = 1,
                globalSuspicionThreshold = 0.15f,
                socialPressureThreshold = 0.50f
            }
        };

        private string carryoverProfileId = "Standard";
        private float carryoverSuspicionMultiplier = 1f;
        private int carryoverReportsOffset = 0;
        private float carryoverGlobalSuspicionOffset = 0f;
        private float carryoverSocialPressureOffset = 0f;
        private int currentPhaseIndex = -1;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureDirector()
        {
            if (FindFirstObjectByType<SessionArcDirector>() != null)
            {
                return;
            }

            var host = new GameObject("SessionArcDirector");
            host.AddComponent<SessionArcDirector>();
        }

        public string CurrentPhaseId
        {
            get
            {
                if (currentPhaseIndex < 0 || phaseConfigs == null || currentPhaseIndex >= phaseConfigs.Length)
                {
                    return string.Empty;
                }

                return phaseConfigs[currentPhaseIndex].phaseId;
            }
        }

        private void Awake()
        {
            TryResolveReferences();
            NormalizePhaseConfigs();
        }

        private void Update()
        {
            if (!HasResolvedReferences())
            {
                TryResolveReferences();
            }

            if (sessionDirector == null || sessionDirector.IsEnded)
            {
                return;
            }

            TickArc(sessionDirector.ElapsedSeconds, sessionDirector.SessionDurationSeconds);
        }

        public void ResolveDependenciesForTesting()
        {
            TryResolveReferences();
        }

        public void TickArc(float elapsedSeconds, float sessionDurationSeconds)
        {
            if (phaseConfigs == null || phaseConfigs.Length == 0 || sessionDurationSeconds <= 0f)
            {
                return;
            }

            float ratio = Mathf.Clamp01(elapsedSeconds / sessionDurationSeconds);
            int nextIndex = ResolvePhaseIndex(ratio);
            if (nextIndex == currentPhaseIndex)
            {
                return;
            }

            currentPhaseIndex = nextIndex;
            ApplyPhase(phaseConfigs[nextIndex], ratio);
        }

        public void SetPhaseConfigsForTesting(ArcPhaseConfig[] configs)
        {
            phaseConfigs = configs;
            currentPhaseIndex = -1;
            NormalizePhaseConfigs();
        }

        public void ConfigureCarryoverProfile(SessionPressureProfile profile)
        {
            carryoverProfileId = string.IsNullOrEmpty(profile.profileId) ? "Standard" : profile.profileId;
            carryoverSuspicionMultiplier = Mathf.Max(0f, profile.suspicionMultiplier);
            carryoverReportsOffset = profile.reportsRequiredOffset;
            carryoverGlobalSuspicionOffset = profile.globalSuspicionThresholdOffset;
            carryoverSocialPressureOffset = profile.socialPressureThresholdOffset;
            currentPhaseIndex = -1;
        }

        private int ResolvePhaseIndex(float ratio)
        {
            int selected = 0;
            for (int i = 0; i < phaseConfigs.Length; i++)
            {
                if (ratio >= phaseConfigs[i].startRatio)
                {
                    selected = i;
                }
            }

            return selected;
        }

        private void ApplyPhase(ArcPhaseConfig phase, float ratio)
        {
            float effectiveSuspicionMultiplier = phase.suspicionDeltaMultiplier * Mathf.Max(0f, carryoverSuspicionMultiplier);
            int effectiveReportsRequired = Mathf.Max(1, phase.reportsRequired + carryoverReportsOffset);
            float effectiveGlobalThreshold = Mathf.Clamp01(phase.globalSuspicionThreshold + carryoverGlobalSuspicionOffset);
            float effectiveSocialThreshold = Mathf.Clamp01(phase.socialPressureThreshold + carryoverSocialPressureOffset);

            violationResponseSystem?.SetRuntimeDeltaMultiplier(effectiveSuspicionMultiplier);
            reportManager?.SetRuntimeThresholdOverrides(
                reportsRequiredOverride: effectiveReportsRequired,
                globalSuspicionThresholdOverride: effectiveGlobalThreshold,
                socialPressureThresholdOverride: effectiveSocialThreshold);

            if (eventLog != null)
            {
                eventLog.RecordEvent(new EventRecord
                {
                    actorId = "SessionArc",
                    actorRole = "System",
                    eventType = EventType.ExplanationGiven,
                    category = EventCategory.Verdict,
                    topic = "SessionArc",
                    note = $"phase={phase.phaseId}; profile={carryoverProfileId}; ratio={ratio:0.00}; mult={effectiveSuspicionMultiplier:0.00}; rr={effectiveReportsRequired}; g={effectiveGlobalThreshold:0.00}; sp={effectiveSocialThreshold:0.00}",
                    severity = 1,
                    placeId = "Session",
                    zoneId = "Session"
                });
            }
        }

        private void NormalizePhaseConfigs()
        {
            if (phaseConfigs == null || phaseConfigs.Length == 0)
            {
                return;
            }

            for (int i = 0; i < phaseConfigs.Length; i++)
            {
                var config = phaseConfigs[i];
                config.startRatio = Mathf.Clamp01(config.startRatio);
                config.suspicionDeltaMultiplier = Mathf.Max(0f, config.suspicionDeltaMultiplier);
                config.reportsRequired = Mathf.Max(1, config.reportsRequired);
                config.globalSuspicionThreshold = Mathf.Clamp01(config.globalSuspicionThreshold);
                config.socialPressureThreshold = Mathf.Clamp01(config.socialPressureThreshold);
                if (string.IsNullOrEmpty(config.phaseId))
                {
                    config.phaseId = $"phase-{i}";
                }

                phaseConfigs[i] = config;
            }

            Array.Sort(phaseConfigs, (left, right) => left.startRatio.CompareTo(right.startRatio));
        }

        private bool HasResolvedReferences()
        {
            return sessionDirector != null
                && violationResponseSystem != null
                && reportManager != null
                && eventLog != null;
        }

        private void TryResolveReferences()
        {
            if (sessionDirector == null)
            {
                sessionDirector = FindFirstObjectByType<SessionDirector>();
            }

            if (violationResponseSystem == null)
            {
                violationResponseSystem = FindFirstObjectByType<ViolationResponseSystem>();
            }

            if (reportManager == null)
            {
                reportManager = FindFirstObjectByType<ReportManager>();
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }
        }
    }
}
