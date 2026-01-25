using System.Collections;
using DreamOfOne.NPC;
using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Core
{
    [RequireComponent(typeof(BoxCollider))]
    public sealed class InteriorPortal : MonoBehaviour
    {
        [SerializeField]
        private InteriorPortal linkedPortal = null;

        [SerializeField]
        private Transform spawnPoint = null;

        [SerializeField]
        [Tooltip("포탈 이동 후 내부 상태로 표시할지 여부")]
        private bool marksInside = false;

        [SerializeField]
        [Tooltip("연속 이동을 막는 쿨다운 시간")]
        private float cooldownSeconds = 0.75f;

        [SerializeField]
        [Tooltip("NPC 자동 복귀까지의 대기 시간 (0이면 비활성)")]
        private float npcAutoReturnSeconds = 6f;

        public bool MarksInside => marksInside;

        private void Reset()
        {
            var collider = GetComponent<BoxCollider>();
            collider.isTrigger = true;
            collider.size = new Vector3(1.5f, 2.2f, 1.5f);
        }

        public void Configure(InteriorPortal linked, Transform targetSpawn, bool inside, float autoReturnSeconds)
        {
            linkedPortal = linked;
            spawnPoint = targetSpawn;
            marksInside = inside;
            npcAutoReturnSeconds = autoReturnSeconds;
        }

        private void OnTriggerEnter(Collider other)
        {
            TryTeleport(other, force: false);
        }

        public void ForceTeleport(GameObject actor)
        {
            if (actor == null)
            {
                return;
            }

            var collider = actor.GetComponentInChildren<Collider>();
            if (collider == null)
            {
                TeleportActor(actor, force: true);
                return;
            }

            TryTeleport(collider, force: true);
        }

        private void TryTeleport(Collider other, bool force)
        {
            if (linkedPortal == null)
            {
                return;
            }

            var root = other.attachedRigidbody != null ? other.attachedRigidbody.transform : other.transform;
            if (root == null)
            {
                return;
            }

            var actor = root.GetComponentInParent<Transform>();
            if (actor == null)
            {
                return;
            }

            bool isPlayer = actor.CompareTag("Player") || actor.GetComponentInParent<CharacterController>() != null;
            bool isNpc = actor.GetComponentInParent<NavMeshAgent>() != null
                || actor.GetComponentInParent<SimplePatrol>() != null
                || actor.GetComponentInParent<PoliceController>() != null;

            if (!isPlayer && !isNpc)
            {
                return;
            }

            TeleportActor(actor.gameObject, force);
        }

        private void TeleportActor(GameObject actor, bool force)
        {
            if (linkedPortal == null || actor == null)
            {
                return;
            }

            var traveler = actor.GetComponent<PortalTraveler>();
            if (traveler == null)
            {
                traveler = actor.AddComponent<PortalTraveler>();
            }

            if (!force && Time.time - traveler.LastTeleportTime < cooldownSeconds)
            {
                return;
            }

            Vector3 origin = actor.transform.position;
            Vector3 destination = linkedPortal.spawnPoint != null
                ? linkedPortal.spawnPoint.position
                : linkedPortal.transform.position;

            var agent = actor.GetComponent<NavMeshAgent>();
            var controller = actor.GetComponent<CharacterController>();

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
                actor.transform.position = destination;
                controller.enabled = true;
            }
            else
            {
                actor.transform.position = destination;
            }

            traveler.LastTeleportTime = Time.time;
            traveler.IsInside = linkedPortal.marksInside;

            if (linkedPortal.marksInside)
            {
                traveler.LastExteriorPosition = origin;
                traveler.HasExteriorFallback = true;
                EnsureFailsafe(actor);
            }

            if (IsNpc(actor))
            {
                SetNpcInside(actor, traveler, traveler.IsInside);
            }

            if (IsNpc(actor) && linkedPortal.marksInside && npcAutoReturnSeconds > 0f)
            {
                linkedPortal.ScheduleReturn(traveler, npcAutoReturnSeconds);
            }
        }

        private void ScheduleReturn(PortalTraveler traveler, float delay)
        {
            if (traveler == null)
            {
                return;
            }

            StartCoroutine(ReturnAfterDelay(traveler, delay));
        }

        private IEnumerator ReturnAfterDelay(PortalTraveler traveler, float delay)
        {
            yield return new WaitForSeconds(delay);
            if (traveler == null || !traveler.IsInside)
            {
                yield break;
            }

            TeleportActor(traveler.gameObject, force: true);
        }

        private static bool IsNpc(GameObject actor)
        {
            return actor.GetComponent<NavMeshAgent>() != null
                || actor.GetComponent<SimplePatrol>() != null
                || actor.GetComponent<PoliceController>() != null;
        }

        private static void SetNpcInside(GameObject actor, PortalTraveler traveler, bool inside)
        {
            var agent = actor.GetComponent<NavMeshAgent>();
            if (agent != null)
            {
                if (inside)
                {
                    traveler.NavMeshAgentWasEnabled = agent.enabled;
                    agent.enabled = false;
                }
                else
                {
                    agent.enabled = traveler.NavMeshAgentWasEnabled;
                }
            }

            var patrol = actor.GetComponent<SimplePatrol>();
            if (patrol != null)
            {
                if (inside)
                {
                    traveler.PatrolWasEnabled = patrol.enabled;
                    patrol.enabled = false;
                }
                else
                {
                    patrol.enabled = traveler.PatrolWasEnabled;
                }
            }

            var police = actor.GetComponent<PoliceController>();
            if (police != null)
            {
                if (inside)
                {
                    traveler.PoliceWasEnabled = police.enabled;
                    police.enabled = false;
                }
                else
                {
                    police.enabled = traveler.PoliceWasEnabled;
                }
            }
        }

        private static void EnsureFailsafe(GameObject actor)
        {
            if (actor == null)
            {
                return;
            }

            if (actor.GetComponent<InteriorFailsafe>() == null)
            {
                actor.AddComponent<InteriorFailsafe>();
            }
        }
    }
}
