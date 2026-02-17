using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// NPC가 일정 간격으로 실내 방문을 수행하도록 유도한다.
    /// </summary>
    public sealed class NpcInteriorRoutine : MonoBehaviour
    {
        [SerializeField]
        private float visitIntervalMin = 18f;

        [SerializeField]
        private float visitIntervalMax = 32f;

        private readonly List<InteriorPortal> portals = new();
        private float nextVisitTime = 0f;
        private PortalTraveler traveler = null;

        private void Awake()
        {
            traveler = GetComponent<PortalTraveler>();
            if (traveler == null)
            {
                traveler = gameObject.AddComponent<PortalTraveler>();
            }

            ScheduleNextVisit();
        }

        private void Update()
        {
            if (traveler == null || traveler.IsInside)
            {
                return;
            }

            if (portals.Count == 0)
            {
                return;
            }

            if (Time.time < nextVisitTime)
            {
                return;
            }

            var portal = portals[Random.Range(0, portals.Count)];
            if (portal != null)
            {
                portal.ForceTeleport(gameObject);
            }

            ScheduleNextVisit();
        }

        public void Configure(IEnumerable<InteriorPortal> exteriorPortals)
        {
            portals.Clear();
            if (exteriorPortals == null)
            {
                return;
            }

            portals.AddRange(exteriorPortals);
            ScheduleNextVisit();
        }

        private void ScheduleNextVisit()
        {
            if (visitIntervalMax < visitIntervalMin)
            {
                visitIntervalMax = visitIntervalMin + 1f;
            }

            nextVisitTime = Time.time + Random.Range(visitIntervalMin, visitIntervalMax);
        }
    }
}
