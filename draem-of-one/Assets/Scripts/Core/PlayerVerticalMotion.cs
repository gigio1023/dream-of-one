using UnityEngine;

namespace DreamOfOne.Core
{
    public static class PlayerVerticalMotion
    {
        public static float UpdateVerticalVelocity(
            float currentVelocity,
            bool grounded,
            bool jumpPressed,
            float gravity,
            float jumpHeight,
            float deltaTime,
            float groundedSnapVelocity)
        {
            float velocity = currentVelocity + gravity * deltaTime;

            if (grounded && velocity < 0f)
            {
                velocity = groundedSnapVelocity;
            }

            if (grounded && jumpPressed)
            {
                velocity = Mathf.Sqrt(jumpHeight * -2f * gravity);
            }

            return velocity;
        }
    }
}
