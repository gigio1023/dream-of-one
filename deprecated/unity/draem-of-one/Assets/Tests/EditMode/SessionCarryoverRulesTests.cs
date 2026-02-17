using DreamOfOne.Core;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class SessionCarryoverRulesTests
    {
        [SetUp]
        public void SetUp()
        {
            SessionCarryoverStore.Clear();
        }

        [TearDown]
        public void TearDown()
        {
            SessionCarryoverStore.Clear();
        }

        [Test]
        public void Advance_CleanPass_ReducesPressureAndIncrementsDay()
        {
            var current = new SessionCarryoverState
            {
                dayIndex = 3,
                pressureTier = 2,
                lastEnding = SessionCarryoverEnding.NarrowEscape
            };

            var next = SessionCarryoverRules.Advance(current, SessionCarryoverEnding.CleanPass);

            Assert.AreEqual(4, next.dayIndex);
            Assert.AreEqual(1, next.pressureTier);
            Assert.AreEqual(SessionCarryoverEnding.CleanPass, next.lastEnding);
        }

        [Test]
        public void Advance_Exposed_ClampsPressureToMax()
        {
            var current = new SessionCarryoverState
            {
                dayIndex = 1,
                pressureTier = 0,
                lastEnding = SessionCarryoverEnding.Unknown
            };

            var next = SessionCarryoverRules.Advance(current, SessionCarryoverEnding.Exposed);

            Assert.AreEqual(2, next.dayIndex);
            Assert.AreEqual(SessionCarryoverRules.MaxPressureTier, next.pressureTier);
            Assert.AreEqual(SessionCarryoverEnding.Exposed, next.lastEnding);
        }

        [Test]
        public void Normalize_ClampsInvalidState()
        {
            var state = new SessionCarryoverState
            {
                dayIndex = 0,
                pressureTier = 99,
                lastEnding = SessionCarryoverEnding.Unknown
            };

            var normalized = SessionCarryoverRules.Normalize(state);
            Assert.AreEqual(SessionCarryoverRules.MinDayIndex, normalized.dayIndex);
            Assert.AreEqual(SessionCarryoverRules.MaxPressureTier, normalized.pressureTier);
        }

        [Test]
        public void ResolveProfile_IsDeterministicByPressureTier()
        {
            var calm = SessionCarryoverRules.ResolveProfile(new SessionCarryoverState { dayIndex = 2, pressureTier = 0 });
            var standard = SessionCarryoverRules.ResolveProfile(new SessionCarryoverState { dayIndex = 2, pressureTier = 1 });
            var strict = SessionCarryoverRules.ResolveProfile(new SessionCarryoverState { dayIndex = 2, pressureTier = 2 });

            Assert.AreEqual("Calm", calm.profileId);
            Assert.AreEqual("Standard", standard.profileId);
            Assert.AreEqual("Strict", strict.profileId);
            Assert.Less(calm.suspicionMultiplier, standard.suspicionMultiplier);
            Assert.Greater(strict.suspicionMultiplier, standard.suspicionMultiplier);
        }

        [Test]
        public void Store_SaveAndLoad_RoundTripsNormalizedState()
        {
            var state = new SessionCarryoverState
            {
                dayIndex = 5,
                pressureTier = 2,
                lastEnding = SessionCarryoverEnding.NarrowEscape
            };

            SessionCarryoverStore.Save(state);
            var loaded = SessionCarryoverStore.Load();

            Assert.AreEqual(5, loaded.dayIndex);
            Assert.AreEqual(2, loaded.pressureTier);
            Assert.AreEqual(SessionCarryoverEnding.NarrowEscape, loaded.lastEnding);
        }
    }
}
