using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Core
{
    public static class PortalNavMeshRecovery
    {
        public static bool TrySnapToNavMesh(Vector3 position, float maxDistance, out Vector3 snappedPosition)
        {
            if (NavMesh.SamplePosition(position, out var hit, maxDistance, NavMesh.AllAreas))
            {
                snappedPosition = hit.position;
                return true;
            }

            snappedPosition = position;
            return false;
        }

        public static void RecoverAgent(NavMeshAgent agent, Vector3 destination, float maxDistance, bool keepEnabled)
        {
            if (agent == null)
            {
                return;
            }

            Vector3 target = destination;
            if (NavMesh.SamplePosition(destination, out var hit, maxDistance, NavMesh.AllAreas))
            {
                target = hit.position;
            }

            if (!agent.enabled)
            {
                agent.enabled = true;
            }

            agent.Warp(target);
            agent.ResetPath();

            if (!keepEnabled)
            {
                agent.enabled = false;
            }
        }
    }
}
