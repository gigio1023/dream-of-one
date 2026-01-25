using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Core
{
    public sealed class InteriorFailsafe : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("내부에 머무를 수 있는 최대 시간(초)")]
        private float maxInsideSeconds = 12f;

        [SerializeField]
        [Tooltip("복구 시 살짝 들어올리는 높이")]
        private float returnLift = 0.1f;

        private PortalTraveler traveler = null;

        private void Awake()
        {
            traveler = GetComponent<PortalTraveler>();
        }

        private void Update()
        {
            if (traveler == null)
            {
                return;
            }

            float secondsInside = Time.time - traveler.LastTeleportTime;
            if (!PortalFailsafe.ShouldReturn(traveler.IsInside, secondsInside, maxInsideSeconds, traveler.HasExteriorFallback))
            {
                return;
            }

            ReturnToExterior();
        }

        private void ReturnToExterior()
        {
            if (traveler == null || !traveler.HasExteriorFallback)
            {
                return;
            }

            Vector3 destination = traveler.LastExteriorPosition + Vector3.up * returnLift;

            var agent = GetComponent<NavMeshAgent>();
            var controller = GetComponent<CharacterController>();

            if (agent != null && agent.enabled)
            {
                bool warped = agent.Warp(destination);
                if (warped && agent.isOnNavMesh)
                {
                    agent.ResetPath();
                }
            }
            else if (controller != null)
            {
                controller.enabled = false;
                transform.position = destination;
                controller.enabled = true;
            }
            else
            {
                transform.position = destination;
            }

            traveler.IsInside = false;
        }
    }
}
