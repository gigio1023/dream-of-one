using DreamOfOne.Core;
using UnityEngine;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// 벤치 주변에 머무르며 양보 규칙(R5)과 연결되는 노인 NPC.
    /// </summary>
    public sealed class ElderController : NPCBase
    {
        [SerializeField]
        [Tooltip("벤치 Zone 또는 좌석 위치")]
        private Zone seatZone = null;

        [SerializeField]
        [Tooltip("의심 누적을 처리할 컴포넌트")]
        private SuspicionComponent suspicion = null;

        [SerializeField]
        [Tooltip("벤치에 앉아 있을 최소 시간")]
        private float waitAtBenchSeconds = 10f;

        private float waitTimer = 0f;

        protected override void Awake()
        {
            base.Awake();
            if (seatZone == null)
            {
                foreach (var zone in FindObjectsByType<Zone>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                {
                    if (zone != null && zone.ZoneType == ZoneType.Seat)
                    {
                        seatZone = zone;
                        break;
                    }
                }
            }
        }

        protected override void OnActing()
        {
            if (seatZone != null && Vector3.Distance(transform.position, seatZone.transform.position) > 1.5f)
            {
                agent.SetDestination(seatZone.transform.position);
                state = NPCState.Moving;
                return;
            }

            waitTimer += Time.deltaTime;
            if (waitTimer >= waitAtBenchSeconds)
            {
                waitTimer = 0f;
                state = NPCState.Cooldown;
            }
        }

        public void OnSeatDenied()
        {
            suspicion?.AddSuspicion(20f, "R5");
        }
    }
}

