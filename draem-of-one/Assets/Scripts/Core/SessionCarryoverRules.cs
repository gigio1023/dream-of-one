using UnityEngine;

namespace DreamOfOne.Core
{
    public enum SessionCarryoverEnding
    {
        Unknown = 0,
        CleanPass = 1,
        NarrowEscape = 2,
        Exposed = 3
    }

    public struct SessionCarryoverState
    {
        public int dayIndex;
        public int pressureTier;
        public SessionCarryoverEnding lastEnding;
    }

    public struct SessionPressureProfile
    {
        public string profileId;
        public float suspicionMultiplier;
        public int reportsRequiredOffset;
        public float globalSuspicionThresholdOffset;
        public float socialPressureThresholdOffset;
        public string briefingLine;
    }

    public static class SessionCarryoverRules
    {
        public const int MinDayIndex = 1;
        public const int MinPressureTier = 0;
        public const int MaxPressureTier = 2;
        public const int DefaultPressureTier = 1;

        public static SessionCarryoverState DefaultState => new SessionCarryoverState
        {
            dayIndex = MinDayIndex,
            pressureTier = DefaultPressureTier,
            lastEnding = SessionCarryoverEnding.Unknown
        };

        public static SessionCarryoverState Normalize(SessionCarryoverState state)
        {
            state.dayIndex = Mathf.Max(MinDayIndex, state.dayIndex);
            state.pressureTier = Mathf.Clamp(state.pressureTier, MinPressureTier, MaxPressureTier);
            return state;
        }

        public static SessionCarryoverState Advance(SessionCarryoverState current, SessionCarryoverEnding ending)
        {
            var next = Normalize(current);
            next.dayIndex = Mathf.Max(MinDayIndex, next.dayIndex + 1);
            next.lastEnding = ending;

            switch (ending)
            {
                case SessionCarryoverEnding.CleanPass:
                    next.pressureTier = Mathf.Max(MinPressureTier, next.pressureTier - 1);
                    break;
                case SessionCarryoverEnding.NarrowEscape:
                    next.pressureTier = Mathf.Min(MaxPressureTier, next.pressureTier + 1);
                    break;
                case SessionCarryoverEnding.Exposed:
                    next.pressureTier = MaxPressureTier;
                    break;
                default:
                    next.pressureTier = Mathf.Clamp(next.pressureTier, MinPressureTier, MaxPressureTier);
                    break;
            }

            return next;
        }

        public static SessionPressureProfile ResolveProfile(SessionCarryoverState state)
        {
            int tier = Normalize(state).pressureTier;
            switch (tier)
            {
                case 0:
                    return new SessionPressureProfile
                    {
                        profileId = "Calm",
                        suspicionMultiplier = 0.90f,
                        reportsRequiredOffset = 1,
                        globalSuspicionThresholdOffset = 0.04f,
                        socialPressureThresholdOffset = 0.05f,
                        briefingLine = "Calm shift. Procedure first."
                    };
                case 2:
                    return new SessionPressureProfile
                    {
                        profileId = "Strict",
                        suspicionMultiplier = 1.15f,
                        reportsRequiredOffset = -1,
                        globalSuspicionThresholdOffset = -0.04f,
                        socialPressureThresholdOffset = -0.05f,
                        briefingLine = "Strict shift. No procedural drift."
                    };
                default:
                    return new SessionPressureProfile
                    {
                        profileId = "Standard",
                        suspicionMultiplier = 1.00f,
                        reportsRequiredOffset = 0,
                        globalSuspicionThresholdOffset = 0f,
                        socialPressureThresholdOffset = 0f,
                        briefingLine = "Standard shift. Blend in and comply."
                    };
            }
        }
    }
}
