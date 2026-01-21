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

        [SerializeField]
        [Tooltip("NavMesh가 없을 때 사용할 이동 속도")]
        private float fallbackMoveSpeed = 2.5f;

        [SerializeField]
        [Tooltip("심문 지연 시간")]
        private float interrogationDelaySeconds = 2f;

        [SerializeField]
        [Tooltip("심문 텍스트 최대 길이")]
        private int maxInterrogationChars = 80;

        [SerializeField]
        private DreamOfOne.LLM.LLMClient llmClient = null;

        private readonly List<EventRecord> buffer = new();

        private NavMeshAgent agent = null;
        private PoliceState state = PoliceState.Patrol;
        private int patrolIndex = 0;
        private float stateTimer = 0f;
        private ReportEnvelope currentReport = null;
        private readonly List<SuspicionComponent> cachedSuspicion = new();

        private void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            CacheSuspicionComponents();
        }

        private void Start()
        {
            CacheSuspicionComponents();
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
            if (HasNavMeshAgent() && patrolPoints.Length > 0 && (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance))
            {
                patrolIndex = (patrolIndex + 1) % patrolPoints.Length;
                agent.SetDestination(patrolPoints[patrolIndex].position);
            }

            if (reportManager != null && reportManager.TryConsumeReport(out var report))
            {
                state = PoliceState.MoveToPlayer;
                stateTimer = 0f;
                currentReport = report;
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

            if (HasNavMeshAgent())
            {
                agent.SetDestination(player.position);
            }
            else
            {
                transform.position = Vector3.MoveTowards(transform.position, player.position, fallbackMoveSpeed * Time.deltaTime);
            }

            if (Vector3.Distance(transform.position, player.position) <= interrogationDistance)
            {
                state = PoliceState.Interrogate;
                stateTimer = 0f;
                if (HasNavMeshAgent())
                {
                    agent.isStopped = true;
                }

                eventLog?.RecordEvent(new EventRecord
                {
                    actorId = name,
                    actorRole = "Police",
                    eventType = EventType.InterrogationStarted,
                    category = EventCategory.Verdict,
                    note = "player"
                });
            }
        }

        /// <summary>
        /// 짧은 지연 후 판정을 내려 UI와 로그에 기록한다.
        /// </summary>
        private void UpdateInterrogate()
        {
            if (stateTimer < interrogationDelaySeconds)
            {
                return;
            }

            string verdict = DetermineVerdict();
            eventLog?.RecordEvent(new EventRecord
            {
                actorId = name,
                actorRole = "Police",
                eventType = EventType.VerdictGiven,
                category = EventCategory.Verdict,
                note = verdict,
                severity = 2
            });

            string text = semanticShaper != null
                ? semanticShaper.ToText(new EventRecord { eventType = EventType.VerdictGiven, note = verdict })
                : $"판정: {verdict}";
            text = DialogueLineLimiter.ClampLine(text, maxInterrogationChars);

            if (llmClient != null)
            {
                llmClient.RequestLine("Police", $"판정 {verdict}", line =>
                    uiManager?.ShowInterrogationText(DialogueLineLimiter.ClampLine(line, maxInterrogationChars)));
            }
            else
            {
                uiManager?.ShowInterrogationText(text);
            }

            ResetReporters();

            state = PoliceState.Cooldown;
            stateTimer = 0f;
        }

        private void UpdateCooldown()
        {
            if (HasNavMeshAgent())
            {
                agent.isStopped = false;
            }

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

            int required = currentReport != null ? currentReport.reporterIds.Count : reportCount;
            if (required >= 2)
            {
                return "외부인";
            }

            if (required == 1)
            {
                return "외부인 의심";
            }

            return "꿈 속 시민";
        }

        private bool HasNavMeshAgent()
        {
            return agent != null && agent.enabled && agent.isOnNavMesh;
        }

        private void CacheSuspicionComponents()
        {
            cachedSuspicion.Clear();
            cachedSuspicion.AddRange(FindObjectsOfType<SuspicionComponent>());
        }

        private void ResetReporters()
        {
            if (currentReport == null || currentReport.reporterIds.Count == 0)
            {
                return;
            }

            for (int i = 0; i < cachedSuspicion.Count; i++)
            {
                var component = cachedSuspicion[i];
                if (component == null)
                {
                    continue;
                }

                if (currentReport.reporterIds.Contains(component.NpcId))
                {
                    component.ResetAfterInterrogation();
                }
            }

            currentReport.resolved = true;
            currentReport = null;
        }

        public void Configure(Transform playerTransform, ReportManager reports, WorldEventLog log, SemanticShaper shaper, UIManager manager, DreamOfOne.LLM.LLMClient client = null)
        {
            player = playerTransform;
            reportManager = reports;
            eventLog = log;
            semanticShaper = shaper;
            uiManager = manager;
            llmClient = client;
        }
    }
}
