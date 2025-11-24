using System.Collections.Generic;
using DreamOfOne.Core;
using DreamOfOne.UI;
using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// 신고 상황을 감시하고 플레이어를 심문하는 경찰 NPC.
    /// NavMeshAgent 상태 머신으로 순찰 → 이동 → 심문 → 쿨다운을 반복한다.
    /// </summary>
    public sealed class PoliceController : MonoBehaviour
    {
        private enum PoliceState
        {
            Patrol,
            MoveToPlayer,
            Interrogate,
            Cooldown
        }

        [SerializeField]
        [Tooltip("순찰 경로 포인트")]
        private Transform[] patrolPoints = System.Array.Empty<Transform>();

        [SerializeField]
        [Tooltip("추적할 플레이어 Transform")]
        private Transform player = null;

        [SerializeField]
        private ReportManager reportManager = null;

        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private SemanticShaper semanticShaper = null;

        [SerializeField]
        private UIManager uiManager = null;

        [SerializeField]
        [Tooltip("플레이어와의 거리 임계값")]
        private float interrogationDistance = 2.0f;

        [SerializeField]
        [Tooltip("심문 이후 Patrol로 돌아가기까지의 대기 시간")]
        private float cooldownSeconds = 5f;

        private readonly List<EventRecord> buffer = new();

        private NavMeshAgent agent = null;
        private PoliceState state = PoliceState.Patrol;
        private int patrolIndex = 0;
        private float stateTimer = 0f;

        private void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
        }

        private void Update()
        {
            stateTimer += Time.deltaTime;

            switch (state)
            {
                case PoliceState.Patrol:
                    UpdatePatrol();
                    break;
                case PoliceState.MoveToPlayer:
                    UpdateMoveToPlayer();
                    break;
                case PoliceState.Interrogate:
                    UpdateInterrogate();
                    break;
                case PoliceState.Cooldown:
                    UpdateCooldown();
                    break;
            }
        }

        /// <summary>
        /// 순찰하며 ReportManager가 심문 조건을 만족했는지 확인한다.
        /// </summary>
        private void UpdatePatrol()
        {
            if (patrolPoints.Length > 0 && (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance))
            {
                patrolIndex = (patrolIndex + 1) % patrolPoints.Length;
                agent.SetDestination(patrolPoints[patrolIndex].position);
            }

            if (reportManager != null && reportManager.ShouldTriggerInterrogation())
            {
                state = PoliceState.MoveToPlayer;
                stateTimer = 0f;
            }
        }

        /// <summary>
        /// 플레이어에게 접근하며 일정 거리 안으로 들어오면 심문 상태로 전환한다.
        /// </summary>
        private void UpdateMoveToPlayer()
        {
            if (player == null)
            {
                state = PoliceState.Patrol;
                return;
            }

            agent.SetDestination(player.position);

            if (Vector3.Distance(transform.position, player.position) <= interrogationDistance)
            {
                state = PoliceState.Interrogate;
                stateTimer = 0f;
                agent.isStopped = true;

                eventLog?.RecordEvent(new EventRecord
                {
                    actorId = name,
                    actorRole = "Police",
                    eventType = EventType.InterrogationStarted,
                    note = "player"
                });
            }
        }

        /// <summary>
        /// 짧은 지연 후 판정을 내려 UI와 로그에 기록한다.
        /// </summary>
        private void UpdateInterrogate()
        {
            if (stateTimer < 2f)
            {
                return;
            }

            string verdict = DetermineVerdict();
            eventLog?.RecordEvent(new EventRecord
            {
                actorId = name,
                actorRole = "Police",
                eventType = EventType.VerdictGiven,
                note = verdict
            });

            string text = semanticShaper != null
                ? semanticShaper.ToText(new EventRecord { eventType = EventType.VerdictGiven, note = verdict })
                : $"판정: {verdict}";

            uiManager?.ShowInterrogationText(text);

            state = PoliceState.Cooldown;
            stateTimer = 0f;
        }

        private void UpdateCooldown()
        {
            agent.isStopped = false;
            if (stateTimer >= cooldownSeconds)
            {
                state = PoliceState.Patrol;
                stateTimer = 0f;
            }
        }

        /// <summary>
        /// 최근 WEL 이벤트만으로 간단한 if-else 판정을 수행한다.
        /// </summary>
        private string DetermineVerdict()
        {
            if (eventLog == null)
            {
                return "꿈 속 시민";
            }

            buffer.Clear();
            buffer.AddRange(eventLog.GetRecent(10));

            int reportCount = 0;
            foreach (var record in buffer)
            {
                if (record.eventType == EventType.ReportFiled)
                {
                    reportCount++;
                }
            }

            if (reportCount >= 2)
            {
                return "외부인";
            }

            if (reportCount == 1)
            {
                return "외부인 의심";
            }

            return "꿈 속 시민";
        }
    }
}
