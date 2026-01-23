using UnityEngine.AI;

namespace DreamOfOne.Core
{
    public static class NavMeshAgentTuning
    {
        public struct Settings
        {
            public float Radius;
            public float Height;
            public float BaseOffset;
            public float Speed;
            public float AngularSpeed;
            public float Acceleration;
            public float StoppingDistance;
            public int AvoidancePriority;
        }

        public static void Apply(NavMeshAgent agent, Settings settings)
        {
            if (agent == null)
            {
                return;
            }

            agent.radius = settings.Radius;
            agent.height = settings.Height;
            agent.baseOffset = settings.BaseOffset > agent.baseOffset
                ? settings.BaseOffset
                : agent.baseOffset;
            agent.speed = settings.Speed;
            agent.angularSpeed = settings.AngularSpeed;
            agent.acceleration = settings.Acceleration;
            agent.stoppingDistance = settings.StoppingDistance;
            agent.avoidancePriority = settings.AvoidancePriority;
        }
    }
}
