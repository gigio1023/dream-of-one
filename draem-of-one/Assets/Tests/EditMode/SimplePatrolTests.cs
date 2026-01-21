using DreamOfOne.NPC;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class SimplePatrolTests
    {
        [Test]
        public void Tick_MovesTowardsWaypoint()
        {
            var waypoint = new GameObject("Waypoint");
            waypoint.transform.position = new Vector3(10f, 0f, 0f);

            var npc = new GameObject("NPC");
            var patrol = npc.AddComponent<SimplePatrol>();
            patrol.Configure(new[] { waypoint.transform }, speed: 5f, arrivalThreshold: 0.1f);

            Vector3 start = npc.transform.position;
            patrol.Tick(1f);

            Assert.Greater(npc.transform.position.x, start.x, "NPC should move toward waypoint.");

            Object.DestroyImmediate(npc);
            Object.DestroyImmediate(waypoint);
        }
    }
}
