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
        private string[] fallbackAnchors =
        {
            "StoreBuilding",
            "StudioBuilding_L1",
            "ParkArea",
            "Station",
            "Cafe"
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
        }

        private void BuildRoute()
        {
            route.Clear();
            var anchorRoot = GameObject.Find("CITY_Anchors");
            if (anchorRoot == null)
            {
                return;
            }

            string role = persona != null ? persona.Role : string.Empty;
            string[] targets = ResolveAnchorsForRole(role);

            for (int i = 0; i < targets.Length; i++)
            {
                string anchorName = targets[i];
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

            if (disableSimplePatrol && route.Count > 0)
            {
                var patrol = GetComponent<SimplePatrol>();
                if (patrol != null)
                {
                    patrol.enabled = false;
                }
            }
        }

        private string[] ResolveAnchorsForRole(string role)
        {
            if (string.IsNullOrEmpty(role))
            {
                return fallbackAnchors;
            }

            string lower = role.ToLowerInvariant();
            if (lower.Contains("police") || lower.Contains("officer"))
            {
                return new[] { "Station" };
            }

            if (lower.Contains("clerk"))
            {
                return new[] { "StoreBuilding" };
            }

            if (lower.Contains("elder") || lower.Contains("park"))
            {
                return new[] { "ParkArea" };
            }

            if (lower.Contains("barista") || lower.Contains("cafe"))
            {
                return new[] { "Cafe" };
            }

            if (lower.Contains("developer") || lower.Contains("pm") || lower.Contains("release") || lower.Contains("studio"))
            {
                return new[] { "StudioBuilding_L1" };
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
