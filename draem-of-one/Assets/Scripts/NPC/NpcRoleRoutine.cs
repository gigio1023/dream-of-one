using System.Collections.Generic;
using DreamOfOne.Core;
using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// 역할에 따라 주요 랜드마크를 순환 방문하는 루틴.
    /// </summary>
    public sealed class NpcRoleRoutine : MonoBehaviour
    {
        [SerializeField]
        private float dwellSeconds = 6f;

        [SerializeField]
        private float arrivalThreshold = 0.6f;

        [SerializeField]
        private bool randomizeRoute = true;

        [SerializeField]
        [Tooltip("역할 루트가 있으면 SimplePatrol을 비활성화")]
        private bool disableSimplePatrol = true;

        [SerializeField]
        private AnchorId[] fallbackAnchors =
        {
            AnchorId.StoreBuilding,
            AnchorId.StudioBuildingL1,
            AnchorId.ParkArea,
            AnchorId.Station,
            AnchorId.Cafe
        };

        private readonly List<Transform> route = new();
        private NavMeshAgent agent = null;
        private NpcPersona persona = null;
        private PortalTraveler traveler = null;
        private float nextMoveTime = 0f;
        private int routeIndex = 0;

        private void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            persona = GetComponent<NpcPersona>();
            traveler = GetComponent<PortalTraveler>();
            if (traveler == null)
            {
                traveler = gameObject.AddComponent<PortalTraveler>();
            }

            BuildRoute();
            nextMoveTime = Time.time + Random.Range(1f, dwellSeconds);
        }

        private void Update()
        {
            if (agent == null || !agent.enabled)
            {
                return;
            }

            if (traveler != null && traveler.IsInside)
            {
                return;
            }

            if (route.Count == 0)
            {
                return;
            }

            if (Time.time < nextMoveTime)
            {
                return;
            }

            if (!agent.isOnNavMesh)
            {
                return;
            }

            if (!agent.pathPending && (agent.remainingDistance <= arrivalThreshold || !agent.hasPath))
            {
                MoveNext();
            }
        }

        public void Configure(IEnumerable<Transform> anchors)
        {
            route.Clear();
            if (anchors == null)
            {
                return;
            }

            route.AddRange(anchors);
            routeIndex = 0;
            nextMoveTime = Time.time + Random.Range(0.5f, dwellSeconds);
            DisableSimplePatrolIfNeeded();
        }

        private void BuildRoute()
        {
            route.Clear();
            var anchorRoot = GameObject.Find("CITY_Anchors");
            if (anchorRoot == null)
            {
                return;
            }

            RoleId role = persona != null ? persona.RoleId : RoleId.None;
            AnchorId[] targets = ResolveAnchorsForRole(role);

            for (int i = 0; i < targets.Length; i++)
            {
                string anchorName = targets[i].ToAnchorName();
                if (string.IsNullOrEmpty(anchorName))
                {
                    continue;
                }

                var anchor = GameObject.Find($"CITY_Anchors/{anchorName}");
                if (anchor != null)
                {
                    route.Add(anchor.transform);
                }
            }

            DisableSimplePatrolIfNeeded();
        }

        private void DisableSimplePatrolIfNeeded()
        {
            if (!disableSimplePatrol || route.Count == 0)
            {
                return;
            }

            var patrol = GetComponent<SimplePatrol>();
            if (patrol != null)
            {
                patrol.enabled = false;
            }
        }

        private AnchorId[] ResolveAnchorsForRole(RoleId role)
        {
            if (role == RoleId.None)
            {
                return fallbackAnchors;
            }

            if (role is RoleId.Police or RoleId.Officer or RoleId.Investigator)
            {
                return new[] { AnchorId.Station };
            }

            if (role is RoleId.Clerk or RoleId.Manager)
            {
                return new[] { AnchorId.StoreBuilding };
            }

            if (role is RoleId.Elder or RoleId.Caretaker)
            {
                return new[] { AnchorId.ParkArea };
            }

            if (role is RoleId.Barista or RoleId.CafeHost)
            {
                return new[] { AnchorId.Cafe };
            }

            if (role is RoleId.Developer or RoleId.PM or RoleId.Release or RoleId.QA)
            {
                return new[] { AnchorId.StudioBuildingL1 };
            }

            return fallbackAnchors;
        }

        private void MoveNext()
        {
            if (route.Count == 0)
            {
                return;
            }

            Transform target = null;
            if (randomizeRoute)
            {
                target = route[Random.Range(0, route.Count)];
            }
            else
            {
                target = route[routeIndex];
                routeIndex = (routeIndex + 1) % route.Count;
            }

            if (target == null)
            {
                return;
            }

            if (NavMesh.SamplePosition(target.position, out var hit, 1.5f, NavMesh.AllAreas))
            {
                agent.SetDestination(hit.position);
            }
            else
            {
                agent.SetDestination(target.position);
            }

            nextMoveTime = Time.time + Random.Range(dwellSeconds * 0.8f, dwellSeconds * 1.2f);
        }
    }
}
