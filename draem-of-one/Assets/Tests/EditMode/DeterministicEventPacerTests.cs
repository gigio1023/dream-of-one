using DreamOfOne.Core;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class DeterministicEventPacerTests
    {
        [Test]
        public void Schedule_EnforcesPerLaneWindowCap()
        {
            var pacer = new DeterministicEventPacer(
                windowSeconds: 1f,
                maxPerLanePerWindow: 2,
                maxGlobalPerWindow: 99,
                jitterSeconds: 0f,
                seed: 42);

            float first = pacer.Schedule("Store", 0f);
            float second = pacer.Schedule("Store", 0f);
            float third = pacer.Schedule("Store", 0f);

            Assert.AreEqual(0f, first, 0.0001f);
            Assert.AreEqual(0f, second, 0.0001f);
            Assert.GreaterOrEqual(third, 1f, "Third event should be delayed into the next pacing window.");
        }

        [Test]
        public void Schedule_EnforcesGlobalWindowCapAcrossLanes()
        {
            var pacer = new DeterministicEventPacer(
                windowSeconds: 1f,
                maxPerLanePerWindow: 4,
                maxGlobalPerWindow: 2,
                jitterSeconds: 0f,
                seed: 7);

            float a = pacer.Schedule("Store", 0f);
            float b = pacer.Schedule("Park", 0f);
            float c = pacer.Schedule("Station", 0f);

            Assert.AreEqual(0f, a, 0.0001f);
            Assert.AreEqual(0f, b, 0.0001f);
            Assert.GreaterOrEqual(c, 1f, "Global cap should delay the third cross-lane event.");
        }

        [Test]
        public void Schedule_IsDeterministicForSameSeed()
        {
            var left = new DeterministicEventPacer(
                windowSeconds: 1.2f,
                maxPerLanePerWindow: 3,
                maxGlobalPerWindow: 6,
                jitterSeconds: 0.35f,
                seed: 9301);

            var right = new DeterministicEventPacer(
                windowSeconds: 1.2f,
                maxPerLanePerWindow: 3,
                maxGlobalPerWindow: 6,
                jitterSeconds: 0.35f,
                seed: 9301);

            for (int i = 0; i < 12; i++)
            {
                float now = i * 0.2f;
                string lane = (i % 2 == 0) ? "Studio" : "Store";
                float leftDue = left.Schedule(lane, now);
                float rightDue = right.Schedule(lane, now);
                Assert.AreEqual(leftDue, rightDue, 0.0001f, $"Determinism mismatch at index {i}");
            }
        }
    }
}
