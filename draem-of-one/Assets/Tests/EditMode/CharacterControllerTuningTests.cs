using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class CharacterControllerTuningTests
    {
        [Test]
        public void Apply_SetsControllerTuningValues()
        {
            var go = new GameObject("Player");
            var controller = go.AddComponent<CharacterController>();

            CharacterControllerTuning.Apply(controller, new CharacterControllerTuning.Settings
            {
                StepOffset = 0.35f,
                SlopeLimit = 42f,
                SkinWidth = 0.06f,
                MinMoveDistance = 0.002f
            });

            Assert.AreEqual(0.35f, controller.stepOffset, 0.0001f);
            Assert.AreEqual(42f, controller.slopeLimit, 0.0001f);
            Assert.AreEqual(0.06f, controller.skinWidth, 0.0001f);
            Assert.AreEqual(0.002f, controller.minMoveDistance, 0.0001f);

            Object.DestroyImmediate(go);
        }
    }
}
