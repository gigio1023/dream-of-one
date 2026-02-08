using DreamOfOne.Society;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class SocietyCadencePolicyTests
    {
        [Test]
        public void Next_WhenObservationMeetsThreshold_UsesActiveCadenceAndResetsIdleCycles()
        {
            SocietyCadenceDecision decision = SocietyCadencePolicy.Next(
                observationCount: 2,
                idleCycles: 3,
                activeObservationThreshold: 1,
                idleCyclesBeforeBackground: 2,
                activeIntervalSeconds: 5f,
                backgroundIntervalSeconds: 12f);

            Assert.IsTrue(decision.IsActive);
            Assert.AreEqual(0, decision.NextIdleCycles);
            Assert.AreEqual(5f, decision.IntervalSeconds);
        }

        [Test]
        public void Next_WhenIdleCyclesReachThreshold_UsesBackgroundCadence()
        {
            SocietyCadenceDecision first = SocietyCadencePolicy.Next(
                observationCount: 0,
                idleCycles: 0,
                activeObservationThreshold: 1,
                idleCyclesBeforeBackground: 2,
                activeIntervalSeconds: 4f,
                backgroundIntervalSeconds: 10f);

            SocietyCadenceDecision second = SocietyCadencePolicy.Next(
                observationCount: 0,
                idleCycles: first.NextIdleCycles,
                activeObservationThreshold: 1,
                idleCyclesBeforeBackground: 2,
                activeIntervalSeconds: 4f,
                backgroundIntervalSeconds: 10f);

            Assert.IsTrue(first.IsActive);
            Assert.IsFalse(second.IsActive);
            Assert.AreEqual(10f, second.IntervalSeconds);
        }

        [Test]
        public void Next_ClampsIntervalToPositiveMinimum()
        {
            SocietyCadenceDecision decision = SocietyCadencePolicy.Next(
                observationCount: 0,
                idleCycles: 5,
                activeObservationThreshold: 1,
                idleCyclesBeforeBackground: 1,
                activeIntervalSeconds: 0f,
                backgroundIntervalSeconds: 0f);

            Assert.AreEqual(0.5f, decision.IntervalSeconds);
        }
    }
}
