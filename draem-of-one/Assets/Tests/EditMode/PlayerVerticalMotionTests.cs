using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class PlayerVerticalMotionTests
    {
        [Test]
        public void UpdateVerticalVelocity_GroundedWithoutJump_SnapsToGroundedVelocity()
        {
            float result = PlayerVerticalMotion.UpdateVerticalVelocity(
                currentVelocity: -2f,
                grounded: true,
                jumpPressed: false,
                gravity: -9.81f,
                jumpHeight: 1.2f,
                deltaTime: 0.02f,
                groundedSnapVelocity: -1f);

            Assert.AreEqual(-1f, result, 0.0001f, "Grounded velocity should snap to grounded snap value.");
        }

        [Test]
        public void UpdateVerticalVelocity_GroundedWithJump_SetsJumpVelocity()
        {
            float expected = Mathf.Sqrt(1.2f * -2f * -9.81f);
            float result = PlayerVerticalMotion.UpdateVerticalVelocity(
                currentVelocity: -1f,
                grounded: true,
                jumpPressed: true,
                gravity: -9.81f,
                jumpHeight: 1.2f,
                deltaTime: 0.02f,
                groundedSnapVelocity: -1f);

            Assert.AreEqual(expected, result, 0.0001f, "Jump should set vertical velocity to jump impulse.");
        }

        [Test]
        public void UpdateVerticalVelocity_Airborne_AppliesGravity()
        {
            float result = PlayerVerticalMotion.UpdateVerticalVelocity(
                currentVelocity: 0f,
                grounded: false,
                jumpPressed: false,
                gravity: -9.81f,
                jumpHeight: 1.2f,
                deltaTime: 0.1f,
                groundedSnapVelocity: -1f);

            Assert.AreEqual(-0.981f, result, 0.0001f, "Airborne velocity should integrate gravity.");
        }
    }
}
