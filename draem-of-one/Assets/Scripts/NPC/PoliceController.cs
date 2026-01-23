using System.Collections.Generic;
using DreamOfOne.Core;
using CoreEventType = DreamOfOne.Core.EventType;
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
            Investigate,
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
        [Tooltip("현장 확인 거리")]
        private float investigationDistance = 2.5f;

        [SerializeField]
        [Tooltip("현장 확인 최대 대기 시간")]
        private float investigationTimeoutSeconds = 6f;

        [SerializeField]
        [Tooltip("심문 이후 Patrol로 돌아가기까지의 대기 시간")]
        private float cooldownSeconds = 5f;

        [SerializeField]
        [Tooltip("NavMesh가 없을 때 사용할 이동 속도")]
        private float fallbackMoveSpeed = 2.5f;

        [SerializeField]
        [Tooltip("자동 점프 여부")]
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
        private CaseBundle currentCase = null;
        private Vector3 investigationTarget = Vector3.zero;
        private string lastVerdictReason = string.Empty;

        public string LastVerdictReason => lastVerdictReason;
        private readonly List<SuspicionComponent> cachedSuspicion = new();
        private float baseOffset = 0f;
        private float jumpTimer = 0f;
        private float jumpCooldown = 0f;

        private void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            if (agent != null)
            {
                baseOffset = agent.baseOffset;
            }

            jumpCooldown = Random.Range(jumpIntervalRange.x, jumpIntervalRange.y);
            EnsureReferences();
            CacheSuspicionComponents();
        }

        private void Start()
        {
            EnsureReferences();
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
                case PoliceState.Investigate:
                    UpdateInvestigate();
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

            UpdateJump(Time.deltaTime);
        }

        /// <summary>
        /// 순찰하며 ReportManager가 심문 조건을 만족했는지 확인한다.
        /// </summary>
        private void UpdatePatrol()
        {
            if (HasNavMeshAgent())
            {
                if (!agent.isOnNavMesh)
                {
                    TryWarpToNavMesh();
                }

                if (agent.isOnNavMesh && patrolPoints.Length > 0 && (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance))
                {
                    patrolIndex = (patrolIndex + 1) % patrolPoints.Length;
                    agent.SetDestination(patrolPoints[patrolIndex].position);
                }
            }

            if (reportManager != null && reportManager.TryConsumeReport(out var report))
            {
                state = PoliceState.Investigate;
                stateTimer = 0f;
                currentReport = report;
                var builder = new CaseBundleBuilder(eventLog);
                currentCase = builder.Build(report);
                investigationTarget = ResolveInvestigationTarget();
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
                if (!agent.isOnNavMesh)
                {
                    TryWarpToNavMesh();
                }

                if (agent.isOnNavMesh)
                {
                    agent.SetDestination(player.position);
                }
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
                    eventType = CoreEventType.InterrogationStarted,
                    category = EventCategory.Verdict,
                    note = "player",
                    position = transform.position,
                    topic = currentCase != null && !string.IsNullOrEmpty(currentCase.topic) ? currentCase.topic : "Interrogation",
                    placeId = currentCase != null ? currentCase.placeId : string.Empty,
                    zoneId = currentCase != null ? currentCase.zoneId : string.Empty
                });

                var statementActor = player != null ? player.name : "Player";
                eventLog?.RecordEvent(new EventRecord
                {
                    actorId = statementActor,
                    actorRole = "Player",
                    eventType = CoreEventType.StatementGiven,
                    category = EventCategory.Verdict,
                    note = "진술 제출",
                    position = player != null ? player.position : transform.position,
                    topic = currentCase != null && !string.IsNullOrEmpty(currentCase.topic) ? currentCase.topic : "Statement",
                    placeId = currentCase != null ? currentCase.placeId : string.Empty,
                    zoneId = currentCase != null ? currentCase.zoneId : string.Empty
                });
            }
        }

        private void UpdateInvestigate()
        {
            if (investigationTarget == Vector3.zero)
            {
                investigationTarget = ResolveInvestigationTarget();
            }

            if (HasNavMeshAgent())
            {
                if (!agent.isOnNavMesh)
                {
                    TryWarpToNavMesh();
                }

                if (agent.isOnNavMesh)
                {
                    agent.SetDestination(investigationTarget);
                }
            }
            else
            {
                transform.position = Vector3.MoveTowards(transform.position, investigationTarget, fallbackMoveSpeed * Time.deltaTime);
            }

            float dist = Vector3.Distance(transform.position, investigationTarget);
            if (dist <= investigationDistance || stateTimer >= investigationTimeoutSeconds)
            {
                EmitEvidenceCapture();
                state = PoliceState.MoveToPlayer;
                stateTimer = 0f;
            }
        }

        private void EmitEvidenceCapture()
        {
            if (eventLog == null)
            {
                return;
            }

            string topic = currentCase != null && !string.IsNullOrEmpty(currentCase.topic) ? currentCase.topic : "Evidence";
            string placeId = currentCase != null ? currentCase.placeId : string.Empty;
            string zoneId = currentCase != null ? currentCase.zoneId : string.Empty;

            eventLog.RecordEvent(new EventRecord
            {
                actorId = name,
                actorRole = "Police",
                eventType = CoreEventType.EvidenceCaptured,
                category = EventCategory.Evidence,
                note = "현장 확인",
                severity = 2,
                position = transform.position,
                topic = topic,
                placeId = placeId,
                zoneId = zoneId
            });
        }

        private Vector3 ResolveInvestigationTarget()
        {
            if (currentCase != null && !string.IsNullOrEmpty(currentCase.zoneId))
            {
                var zone = GameObject.Find(currentCase.zoneId);
                if (zone != null)
                {
                    return zone.transform.position;
                }
            }

            if (currentCase != null && !string.IsNullOrEmpty(currentCase.placeId))
            {
                var place = GameObject.Find(currentCase.placeId);
                if (place != null)
                {
                    return place.transform.position;
                }
            }

            return player != null ? player.position : transform.position;
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

            if (eventLog != null && currentReport != null)
            {
                var builder = new CaseBundleBuilder(eventLog);
                currentCase = builder.Build(currentReport);
            }

            string verdict = DetermineVerdict();
            string topic = currentCase != null && !string.IsNullOrEmpty(currentCase.topic) ? currentCase.topic : "Verdict";
            string placeId = currentCase != null ? currentCase.placeId : string.Empty;
            string zoneId = currentCase != null ? currentCase.zoneId : string.Empty;
            eventLog?.RecordEvent(new EventRecord
            {
                actorId = name,
                actorRole = "Police",
                eventType = CoreEventType.VerdictGiven,
                category = EventCategory.Verdict,
                note = verdict,
                severity = 2,
                position = transform.position,
                topic = topic,
                placeId = placeId,
                zoneId = zoneId
            });

            eventLog?.RecordEvent(new EventRecord
            {
                actorId = name,
                actorRole = "Police",
                eventType = CoreEventType.ExplanationGiven,
                category = EventCategory.Verdict,
                note = string.IsNullOrEmpty(lastVerdictReason) ? verdict : lastVerdictReason,
                severity = 1,
                position = transform.position,
                topic = topic,
                placeId = placeId,
                zoneId = zoneId
            });

            string text = semanticShaper != null
                ? semanticShaper.ToText(new EventRecord { eventType = CoreEventType.VerdictGiven, note = verdict })
                : $"판정: {verdict}";
            text = DialogueLineLimiter.ClampLine(text, maxInterrogationChars);

            if (uiManager != null)
            {
                string bundleText = CaseBundleFormatter.BuildSummary(currentCase);
                uiManager.ShowCaseBundle(bundleText);
            }

            var artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            if (artifactSystem != null)
            {
                artifactSystem.HighlightCase(currentCase);
            }

            if (llmClient != null)
            {
                var request = new DreamOfOne.LLM.LLMClient.LineRequest
                {
                    role = "Police",
                    persona = "경찰, 단호하고 간결한 말투",
                    situation = $"판정 {verdict}. 근거: {lastVerdictReason}",
                    tone = "firm",
                    constraints = "한 줄, 80자 이내"
                };

                llmClient.RequestLine(request, line =>
                    uiManager?.ShowInterrogationText(DialogueLineLimiter.ClampLine(line, maxInterrogationChars)));
            }
            else
            {
                string finalText = string.IsNullOrEmpty(lastVerdictReason)
                    ? text
                    : DialogueLineLimiter.ClampLine($"{text} ({lastVerdictReason})", maxInterrogationChars);
                uiManager?.ShowInterrogationText(finalText);
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

        private void TryWarpToNavMesh()
        {
            if (agent == null)
            {
                return;
            }

            if (NavMesh.SamplePosition(transform.position, out var hit, 2f, NavMesh.AllAreas))
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

        /// <summary>
        /// 최근 WEL 이벤트만으로 간단한 if-else 판정을 수행한다.
        /// </summary>
        private string DetermineVerdict()
        {
            if (currentCase == null)
            {
                lastVerdictReason = "기록 부족";
                return "꿈 속 시민";
            }

            int score = currentCase.Score;
            lastVerdictReason = $"신고{currentCase.reports.Count}/증거{currentCase.evidence.Count}/위반{currentCase.violations.Count}";
            if (score >= 6)
            {
                return "퇴출";
            }

            if (score >= 3)
            {
                return "의심 강화";
            }

            if (score >= 2)
            {
                return "보류";
            }

            return "무혐의";
        }

        private bool HasNavMeshAgent()
        {
            return agent != null && agent.enabled;
        }

        private void CacheSuspicionComponents()
        {
            cachedSuspicion.Clear();
            cachedSuspicion.AddRange(FindObjectsByType<SuspicionComponent>(FindObjectsInactive.Include, FindObjectsSortMode.None));
        }

        private void EnsureReferences()
        {
            if (player == null)
            {
                var playerObject = GameObject.FindGameObjectWithTag("Player");
                if (playerObject != null)
                {
                    player = playerObject.transform;
                }
            }

            if (reportManager == null)
            {
                reportManager = FindFirstObjectByType<ReportManager>();
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (semanticShaper == null)
            {
                semanticShaper = FindFirstObjectByType<SemanticShaper>();
            }

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }

            if (llmClient == null)
            {
                llmClient = FindFirstObjectByType<DreamOfOne.LLM.LLMClient>();
            }
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
