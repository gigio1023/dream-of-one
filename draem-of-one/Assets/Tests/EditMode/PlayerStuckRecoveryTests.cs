using DreamOfOne.Core;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class PlayerStuckRecoveryTests
    {
        [Test]
        public void UpdateStuckTimer_NoInputOrNoCollision_Resets()
        {
            float result = PlayerStuckRecovery.UpdateStuckTimer(
                currentTimer: 0.4f,
                inputMagnitude: 0f,
                velocityMagnitude: 0f,
                hasSideCollision: true,
                deltaTime: 0.1f,
                inputThreshold: 0.2f,
                velocityThreshold: 0.05f);

            Assert.AreEqual(0f, result, 0.0001f);
        }

        [Test]
        public void UpdateStuckTimer_InputAndCollisionIncrements()
        {
            float result = PlayerStuckRecovery.UpdateStuckTimer(
                currentTimer: 0.1f,
                inputMagnitude: 0.6f,
                velocityMagnitude: 0.01f,
                hasSideCollision: true,
                deltaTime: 0.2f,
                inputThreshold: 0.2f,
                velocityThreshold: 0.05f);

            Assert.AreEqual(0.3f, result, 0.0001f);
        }

        [Test]
        public void ShouldRecover_TrueWhenTimerExceedsDelay()
        {
            bool result = PlayerStuckRecovery.ShouldRecover(
                stuckTimer: 0.6f,
                recoveryDelay: 0.5f,
                inputMagnitude: 0.6f,
                velocityMagnitude: 0.01f,
                hasSideCollision: true,
                inputThreshold: 0.2f,
                velocityThreshold: 0.05f);

            Assert.IsTrue(result);
        }

        [Test]
        public void ShouldRecover_FalseWhenVelocityHigh()
        {
            bool result = PlayerStuckRecovery.ShouldRecover(
                stuckTimer: 1.2f,
                recoveryDelay: 0.5f,
                inputMagnitude: 0.6f,
                velocityMagnitude: 0.4f,
                hasSideCollision: true,
                inputThreshold: 0.2f,
                velocityThreshold: 0.05f);

            Assert.IsFalse(result);
        }
    }
}
