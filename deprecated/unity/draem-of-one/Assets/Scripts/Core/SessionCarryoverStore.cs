using UnityEngine;

namespace DreamOfOne.Core
{
    public static class SessionCarryoverStore
    {
        private const string DayKey = "doo.session.day";
        private const string PressureKey = "doo.session.pressure";
        private const string LastEndingKey = "doo.session.last_ending";

        public static SessionCarryoverState Load()
        {
            var state = new SessionCarryoverState
            {
                dayIndex = PlayerPrefs.GetInt(DayKey, SessionCarryoverRules.MinDayIndex),
                pressureTier = PlayerPrefs.GetInt(PressureKey, SessionCarryoverRules.DefaultPressureTier),
                lastEnding = (SessionCarryoverEnding)PlayerPrefs.GetInt(LastEndingKey, (int)SessionCarryoverEnding.Unknown)
            };

            return SessionCarryoverRules.Normalize(state);
        }

        public static void Save(SessionCarryoverState state)
        {
            var normalized = SessionCarryoverRules.Normalize(state);
            PlayerPrefs.SetInt(DayKey, normalized.dayIndex);
            PlayerPrefs.SetInt(PressureKey, normalized.pressureTier);
            PlayerPrefs.SetInt(LastEndingKey, (int)normalized.lastEnding);
            PlayerPrefs.Save();
        }

        public static void Clear()
        {
            PlayerPrefs.DeleteKey(DayKey);
            PlayerPrefs.DeleteKey(PressureKey);
            PlayerPrefs.DeleteKey(LastEndingKey);
            PlayerPrefs.Save();
        }
    }
}
