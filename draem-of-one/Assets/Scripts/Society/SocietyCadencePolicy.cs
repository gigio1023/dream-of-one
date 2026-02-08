using UnityEngine;

namespace DreamOfOne.Society
{
    public readonly struct SocietyCadenceDecision
    {
        public SocietyCadenceDecision(bool isActive, int nextIdleCycles, float intervalSeconds)
        {
            IsActive = isActive;
            NextIdleCycles = nextIdleCycles;
            IntervalSeconds = intervalSeconds;
        }

        public bool IsActive { get; }
        public int NextIdleCycles { get; }
        public float IntervalSeconds { get; }
    }

    /// <summary>
    /// Stateless cadence policy used by SocietyBrain so scheduling behavior remains testable.
    /// </summary>
    public static class SocietyCadencePolicy
    {
        public static SocietyCadenceDecision Next(
            int observationCount,
            int idleCycles,
            int activeObservationThreshold,
            int idleCyclesBeforeBackground,
            float activeIntervalSeconds,
            float backgroundIntervalSeconds)
        {
            int threshold = Mathf.Max(1, activeObservationThreshold);
            int backgroundAfter = Mathf.Max(1, idleCyclesBeforeBackground);
            int nextIdleCycles = observationCount >= threshold ? 0 : idleCycles + 1;

            bool isActive = observationCount >= threshold || nextIdleCycles < backgroundAfter;
            float interval = isActive ? activeIntervalSeconds : backgroundIntervalSeconds;
            interval = Mathf.Max(0.5f, interval);

            return new SocietyCadenceDecision(isActive, nextIdleCycles, interval);
        }
    }
}
