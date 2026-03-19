namespace DreamOfOne.Core
{
    public static class PlayerStuckRecovery
    {
        public static float UpdateStuckTimer(
            float currentTimer,
            float inputMagnitude,
            float velocityMagnitude,
            bool hasSideCollision,
            float deltaTime,
            float inputThreshold,
            float velocityThreshold)
        {
            if (!hasSideCollision || inputMagnitude < inputThreshold || velocityMagnitude > velocityThreshold)
            {
                return 0f;
            }

            return currentTimer + deltaTime;
        }

        public static bool ShouldRecover(
            float stuckTimer,
            float recoveryDelay,
            float inputMagnitude,
            float velocityMagnitude,
            bool hasSideCollision,
            float inputThreshold,
            float velocityThreshold)
        {
            if (!hasSideCollision)
            {
                return false;
            }

            if (inputMagnitude < inputThreshold || velocityMagnitude > velocityThreshold)
            {
                return false;
            }

            return stuckTimer >= recoveryDelay;
        }
    }
}
