using UnityEngine;

namespace DreamOfOne.Core
{
    public static class CharacterControllerTuning
    {
        public struct Settings
        {
            public float StepOffset;
            public float SlopeLimit;
            public float SkinWidth;
            public float MinMoveDistance;
        }

        public static void Apply(CharacterController controller, Settings settings)
        {
            if (controller == null)
            {
                return;
            }

            controller.stepOffset = settings.StepOffset;
            controller.slopeLimit = settings.SlopeLimit;
            controller.skinWidth = settings.SkinWidth;
            controller.minMoveDistance = settings.MinMoveDistance;
        }
    }
}
