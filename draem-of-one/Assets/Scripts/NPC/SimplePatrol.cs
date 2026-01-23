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

        [SerializeField]
        [Tooltip("NavMeshAgent가 없을 때도 Transform 이동을 허용할지 여부")]
        private bool allowTransformFallback = false;

        [SerializeField]
        [Tooltip("NavMesh에 올라가지 못했을 때 워프를 시도할 반경")]
        private float warpSearchRadius = 2f;

        [SerializeField]
        [Tooltip("NPC가 주기적으로 점프할지 여부")]
        private bool autoJump = true;

        [SerializeField]
        [Tooltip("점프 높이")]
        private float jumpHeight = 0.35f;

        [SerializeField]
        [Tooltip("점프 지속 시간")]
        private float jumpDuration = 0.5f;

        [SerializeField]
        [Tooltip("점프 간격 최소/최대 (초)")]
        private Vector2 jumpIntervalRange = new Vector2(4f, 7f);

        private int index = 0;
        private NavMeshAgent agent = null;
        private bool destinationSet = false;
        private bool warpAttempted = false;
        private float baseOffset = 0f;
        private float jumpTimer = 0f;
        private float jumpCooldown = 0f;

        private void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            if (agent != null)
            {
                agent.speed = speed;
                agent.stoppingDistance = arrivalThreshold;
                agent.angularSpeed = 360f;
                baseOffset = agent.baseOffset;
            }

            jumpCooldown = Random.Range(jumpIntervalRange.x, jumpIntervalRange.y);
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

            if (agent != null && agent.enabled)
            {
                if (!agent.isOnNavMesh)
                {
                    TryWarpToNavMesh();
                    return;
                }

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

                UpdateJump(deltaTime);
                return;
            }

            if (!allowTransformFallback)
            {
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

            UpdateJump(deltaTime);
        }

        private void TryWarpToNavMesh()
        {
            if (warpAttempted || agent == null)
            {
                return;
            }

            warpAttempted = true;
            if (NavMesh.SamplePosition(transform.position, out var hit, warpSearchRadius, NavMesh.AllAreas))
            {
                agent.Warp(hit.position);
            }
        }

        private void UpdateJump(float deltaTime)
        {
            if (!autoJump || agent == null)
            {
                return;
            }

            if (jumpHeight <= 0f || jumpDuration <= 0f)
            {
                return;
            }

            if (jumpCooldown > 0f)
            {
                jumpCooldown -= deltaTime;
                return;
            }

            if (jumpTimer <= 0f)
            {
                jumpTimer = jumpDuration;
            }

            float t = 1f - (jumpTimer / jumpDuration);
            float offset = Mathf.Sin(t * Mathf.PI) * jumpHeight;
            agent.baseOffset = baseOffset + offset;

            jumpTimer -= deltaTime;
            if (jumpTimer <= 0f)
            {
                agent.baseOffset = baseOffset;
                jumpCooldown = Random.Range(jumpIntervalRange.x, jumpIntervalRange.y);
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
