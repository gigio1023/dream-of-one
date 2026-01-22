using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// NavMesh 없이도 동작하는 간단한 순찰 이동.
    /// </summary>
    public sealed class SimplePatrol : MonoBehaviour
    {
        [SerializeField]
        private Transform[] waypoints = System.Array.Empty<Transform>();

        [SerializeField]
        private float speed = 2f;

        [SerializeField]
        private float arrivalThreshold = 0.2f;

        private int index = 0;
        private NavMeshAgent agent = null;
        private bool destinationSet = false;

        private void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            if (agent != null)
            {
                agent.speed = speed;
                agent.stoppingDistance = arrivalThreshold;
                agent.angularSpeed = 360f;
            }
        }

        private void Start()
        {
            if (waypoints == null || waypoints.Length == 0)
            {
                var left = new GameObject($"{name}_WP_A").transform;
                left.position = transform.position + new Vector3(-1.5f, 0f, -1.5f);

                var right = new GameObject($"{name}_WP_B").transform;
                right.position = transform.position + new Vector3(1.5f, 0f, 1.5f);

                Configure(new[] { left, right }, speed, arrivalThreshold);
            }
        }

        private void Update()
        {
            Tick(Time.deltaTime);
        }

        public void Tick(float deltaTime)
        {
            if (waypoints == null || waypoints.Length == 0)
            {
                return;
            }

            var target = waypoints[index];
            if (target == null)
            {
                return;
            }

            if (agent != null && agent.enabled && agent.isOnNavMesh)
            {
                if (!destinationSet)
                {
                    agent.SetDestination(target.position);
                    destinationSet = true;
                }

                if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.05f)
                {
                    index = (index + 1) % waypoints.Length;
                    destinationSet = false;
                }

                return;
            }

            Vector3 toTarget = target.position - transform.position;
            Vector3 planar = new Vector3(toTarget.x, 0f, toTarget.z);
            float distance = planar.magnitude;

            if (distance <= arrivalThreshold)
            {
                index = (index + 1) % waypoints.Length;
                return;
            }

            Vector3 direction = planar.normalized;
            transform.position += direction * speed * deltaTime;
            if (direction.sqrMagnitude > 0.001f)
            {
                transform.forward = direction;
            }
        }

        public void Configure(Transform[] patrolPoints, float speed, float arrivalThreshold)
        {
            waypoints = patrolPoints ?? System.Array.Empty<Transform>();
            this.speed = speed;
            this.arrivalThreshold = arrivalThreshold;

            if (agent != null)
            {
                agent.speed = speed;
                agent.stoppingDistance = arrivalThreshold;
            }
        }
    }
}
