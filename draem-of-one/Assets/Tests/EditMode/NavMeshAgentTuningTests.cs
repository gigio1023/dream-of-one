using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Tests
{
    public class NavMeshAgentTuningTests
    {
        [Test]
        public void Apply_SetsAgentParameters()
        {
            var go = new GameObject("Agent");
            var agent = go.AddComponent<NavMeshAgent>();

            NavMeshAgentTuning.Apply(agent, new NavMeshAgentTuning.Settings
            {
                Radius = 0.28f,
                Height = 1.6f,
                BaseOffset = 0.05f,
                Speed = 1.8f,
                AngularSpeed = 420f,
                Acceleration = 10f,
                StoppingDistance = 0.3f,
                AvoidancePriority = 45
            });

            Assert.AreEqual(0.28f, agent.radius, 0.0001f);
            Assert.AreEqual(1.6f, agent.height, 0.0001f);
            Assert.AreEqual(0.05f, agent.baseOffset, 0.0001f);
            Assert.AreEqual(1.8f, agent.speed, 0.0001f);
            Assert.AreEqual(420f, agent.angularSpeed, 0.0001f);
            Assert.AreEqual(10f, agent.acceleration, 0.0001f);
            Assert.AreEqual(0.3f, agent.stoppingDistance, 0.0001f);
            Assert.AreEqual(45, agent.avoidancePriority);

            Object.DestroyImmediate(go);
        }
    }
}
