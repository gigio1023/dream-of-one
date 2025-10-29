using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class NpcController : MonoBehaviour
    {
        [SerializeField]
        private Transform[] patrolWaypoints = new Transform[0];

        [SerializeField]
        private float moveSpeedMetersPerSecond = 2.0f;

        [SerializeField]
        private float waypointEpsilonMeters = 0.25f;

        private int currentWaypointIndex = 0;

        private void Update()
        {
            if (patrolWaypoints == null || patrolWaypoints.Length == 0)
            {
                return;
            }

            Transform target = patrolWaypoints[currentWaypointIndex];
            if (target == null)
            {
                return;
            }

            Vector3 toTarget = target.position - transform.position;
            Vector3 planar = new Vector3(toTarget.x, 0f, toTarget.z);
            float distance = planar.magnitude;

            if (distance <= waypointEpsilonMeters)
            {
                currentWaypointIndex = (currentWaypointIndex + 1) % patrolWaypoints.Length;
                return;
            }

            Vector3 dir = planar.normalized;
            transform.position += dir * moveSpeedMetersPerSecond * Time.deltaTime;
            if (dir.sqrMagnitude > 0.001f)
            {
                transform.forward = dir;
            }
        }
    }
}


