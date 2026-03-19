using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using DreamOfOne.Core;
using DreamOfOne.LLM;
using DreamOfOne.NPC;
using DreamOfOne.World;
using UnityEngine;
using UnityEngine.AI;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.Society
{
    /// <summary>
    /// Minimal policy-driven LLM "brain" loop:
    /// observe -> plan(JSON) -> validate -> execute(skill) -> emit WEL.
    /// </summary>
    public sealed class SocietyBrain : MonoBehaviour
    {
        private static readonly string[] DefaultAllowedSkills =
        {
            "Speak",
            "MoveToAnchor",
            "FileReport"
        };

        private static readonly string[] BaselineAllowedActionTypes =
        {
            "Observe",
            "Work",
            "Idle"
        };

        private static readonly string[] ReportingAuthorityRoleKeywords =
        {
            "police",
            "officer",
            "investigator",
            "manager",
            "pm",
            "qa",
            "clerk"
        };

        [SerializeField]
        [Tooltip("Decision interval per agent (seconds).")]
        private float decisionIntervalSeconds = 7f;

        [SerializeField]
        [Tooltip("How many recent WEL events to consider as observations.")]
        private int observeRecentEvents = 8;

        [SerializeField]
        [Tooltip("If true, requests LLM plans. If false, only deterministic fallback behaviors run.")]
        private bool enableLlmPlanning = true;

        [SerializeField]
        [Tooltip("If true, tries backend npc-runtime decision path before local LLM planning.")]
        private bool useBackendDecisionRuntime = true;

        [SerializeField]
        [Tooltip("If backend request fails, optionally fallback to local LLM planning instead of deterministic fallback.")]
        private bool allowLocalLlmFallbackOnBackendError = false;

        [SerializeField]
        [Tooltip("Debug logs for plan parse/validation.")]
        private bool verbose = false;

        [SerializeField]
        [Tooltip("Suppress repeated fallback metadata logs with same reason within this window (seconds).")]
        private float fallbackMetaSuppressWindowSeconds = 2f;

        private PolicyPackDefinition policyPack = null;
        private WorldEventLog eventLog = null;
        private LLMClient llmClient = null;
        private SocietyRuntimeClient runtimeClient = null;
        private ReportManager reportManager = null;
        private SemanticShaper semanticShaper = null;
        private SessionDirector sessionDirector = null;
        private GlobalSuspicionSystem globalSuspicionSystem = null;
        private ExposureSystem exposureSystem = null;
        private SessionArcDirector sessionArcDirector = null;
        private string sessionId = string.Empty;
        private string backendThreadId = string.Empty;

        private NpcPersona persona = null;
        private NavMeshAgent agent = null;
        private SocietyMemory memory = null;

        private float nextDecisionTime = -999f;
        private readonly HashSet<string> seenEventIds = new();
        private ActionOutcome lastOutcome = new();
        private string lastFallbackMetaSignature = string.Empty;
        private float lastFallbackMetaLoggedAt = -999f;
        private int suppressedFallbackMetaCount = 0;

        public void Configure(
            PolicyPackDefinition pack,
            WorldEventLog log,
            LLMClient llm,
            ReportManager reports,
            SemanticShaper shaper,
            SocietyRuntimeClient runtime = null)
        {
            policyPack = pack;
            eventLog = log;
            llmClient = llm;
            reportManager = reports;
            semanticShaper = shaper;
            runtimeClient = runtime;
        }

        private void Awake()
        {
            persona = GetComponent<NpcPersona>();
            agent = GetComponent<NavMeshAgent>();
            memory = GetComponent<SocietyMemory>();
            if (memory == null)
            {
                memory = gameObject.AddComponent<SocietyMemory>();
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (llmClient == null)
            {
                llmClient = FindFirstObjectByType<LLMClient>();
            }

            if (reportManager == null)
            {
                reportManager = FindFirstObjectByType<ReportManager>();
            }

            if (semanticShaper == null)
            {
                semanticShaper = FindFirstObjectByType<SemanticShaper>();
            }

            if (sessionDirector == null)
            {
                sessionDirector = FindFirstObjectByType<SessionDirector>();
            }

            if (runtimeClient == null)
            {
                runtimeClient = FindFirstObjectByType<SocietyRuntimeClient>();
            }

            if (globalSuspicionSystem == null)
            {
                globalSuspicionSystem = FindFirstObjectByType<GlobalSuspicionSystem>();
            }

            if (exposureSystem == null)
            {
                exposureSystem = FindFirstObjectByType<ExposureSystem>();
            }

            if (sessionArcDirector == null)
            {
                sessionArcDirector = FindFirstObjectByType<SessionArcDirector>();
            }

            if (string.IsNullOrEmpty(sessionId))
            {
                sessionId = Guid.NewGuid().ToString("N");
            }
        }

        private void Start()
        {
            nextDecisionTime = Time.time + UnityEngine.Random.Range(1f, decisionIntervalSeconds);
        }

        private void Update()
        {
            if (persona == null || eventLog == null)
            {
                return;
            }

            if (Time.time < nextDecisionTime)
            {
                return;
            }

            nextDecisionTime = Time.time + decisionIntervalSeconds + UnityEngine.Random.Range(-0.5f, 0.8f);
            RunDecisionCycle();
        }

        /// <summary>
        /// Debug entrypoint used by editor tools to trigger one decision cycle immediately.
        /// </summary>
        public void DebugRunDecisionCycle()
        {
            if (persona == null || eventLog == null)
            {
                return;
            }

            RunDecisionCycle();
        }

        private void RunDecisionCycle()
        {
            var observations = CollectObservations();
            if (observations.Count > 0)
            {
                for (int i = 0; i < observations.Count; i++)
                {
                    memory.Add($"OBS: {observations[i]}");
                }
            }

            if (!enableLlmPlanning)
            {
                DeterministicFallback("llm_planning_disabled");
                return;
            }

            var allowed = ResolveAllowedSkills();
            var packet = BuildPerceptionPacket(allowed, observations);
            if (TryRequestBackendDecision(packet, allowed, observations))
            {
                return;
            }

            RequestLocalLlmDecision(packet, observations);
        }

        public bool TryApplyIntentJson(string rawIntentJson, out string blockedReason)
        {
            blockedReason = string.Empty;

            if (!SocietyJson.TryParseIntent(rawIntentJson, persona != null ? persona.NpcId : string.Empty, out var intent, out string parseError))
            {
                blockedReason = $"invalid_intent:{parseError}";
                RecordContractEvent(CoreEventType.IntentRejected, blockedReason, actionType: string.Empty);
                DeterministicFallback(blockedReason);
                return false;
            }

            return TryApplyIntent(intent, ResolveAllowedSkills(), out blockedReason);
        }

        private bool TryRequestBackendDecision(PerceptionPacket packet, string[] allowedSkills, List<string> observations)
        {
            if (!useBackendDecisionRuntime || runtimeClient == null || !runtimeClient.BackendEnabled)
            {
                return false;
            }

            packet.cognitionPath = string.IsNullOrEmpty(backendThreadId) ? "codex" : "codex-reply";
            packet.threadId = backendThreadId ?? string.Empty;

            runtimeClient.RequestDecision(packet, (envelope, error) =>
            {
                if (this == null || !isActiveAndEnabled)
                {
                    return;
                }

                if (!string.IsNullOrEmpty(error))
                {
                    if (verbose)
                    {
                        Debug.LogWarning($"[SocietyBrain:{persona.NpcId}] backend decision failed: {error}");
                    }

                    if (allowLocalLlmFallbackOnBackendError)
                    {
                        RequestLocalLlmDecision(packet, observations);
                    }
                    else
                    {
                        DeterministicFallback(error);
                    }

                    return;
                }

                if (envelope == null || envelope.intent == null)
                {
                    DeterministicFallback("runtime_empty_envelope");
                    return;
                }

                if (envelope.meta != null && !string.IsNullOrWhiteSpace(envelope.meta.threadId))
                {
                    backendThreadId = envelope.meta.threadId;
                }

                RecordBackendDecisionMeta(envelope.meta, envelope.intent);

                if (!TryApplyIntent(envelope.intent, allowedSkills, out string blockedReason) && verbose)
                {
                    Debug.LogWarning($"[SocietyBrain:{persona.NpcId}] backend intent rejected: {blockedReason}");
                }
            });

            return true;
        }

        private void RequestLocalLlmDecision(PerceptionPacket packet, List<string> observations)
        {
            if (llmClient == null)
            {
                DeterministicFallback("local_llm_missing");
                return;
            }

            var request = BuildPlanRequest(packet, observations);
            llmClient.RequestText(request, raw =>
            {
                if (!TryApplyIntentJson(raw, out string blockedReason) && verbose)
                {
                    Debug.LogWarning($"[SocietyBrain:{persona.NpcId}] intent rejected: {blockedReason}");
                }
            });
        }

        private List<string> CollectObservations()
        {
            var results = new List<string>();

            int count = Mathf.Clamp(observeRecentEvents, 0, 32);
            if (count == 0 || eventLog == null)
            {
                return results;
            }

            var recent = eventLog.GetRecent(count);
            for (int i = 0; i < recent.Count; i++)
            {
                var record = recent[i];
                if (record == null)
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(record.id) && seenEventIds.Contains(record.id))
                {
                    continue;
                }

                // Don't react to our own utterances (avoid loops).
                if (record.eventType == CoreEventType.NpcUtterance && record.actorId == persona.NpcId)
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(record.id))
                {
                    seenEventIds.Add(record.id);
                }

                string text = semanticShaper != null ? semanticShaper.ToText(record) : record.eventType.ToString();
                if (record.eventType == CoreEventType.NpcUtterance && !string.IsNullOrEmpty(record.note))
                {
                    text = $"{record.actorId}: {record.note}";
                }

                results.Add(text);
            }

            return results;
        }

        private string[] ResolveAllowedSkills()
        {
            if (persona == null)
            {
                return DefaultAllowedSkills;
            }

            var roleDef = ResolveRoleDefinition(persona.RoleId);
            if (roleDef != null && roleDef.AllowedSkillIds != null && roleDef.AllowedSkillIds.Length > 0)
            {
                return roleDef.AllowedSkillIds;
            }

            return DefaultAllowedSkills;
        }

        private RoleDefinition ResolveRoleDefinition(RoleId roleId)
        {
            if (policyPack == null || policyPack.Roles == null || policyPack.Roles.Length == 0)
            {
                return null;
            }

            for (int i = 0; i < policyPack.Roles.Length; i++)
            {
                var role = policyPack.Roles[i];
                if (role == null)
                {
                    continue;
                }

                if (role.RoleId == roleId)
                {
                    return role;
                }
            }

            return null;
        }

        private LLMClient.TextRequest BuildPlanRequest(PerceptionPacket packet, List<string> observations)
        {
            var system = new StringBuilder();
            system.AppendLine("You are an untrusted planner for an NPC in a social simulation game.");
            system.AppendLine("Return JSON only. No markdown. No extra commentary.");
            system.AppendLine("Propose one safe intent that the engine will validate and execute deterministically.");
            system.AppendLine("Do NOT invent evidence. Do NOT change the world directly.");
            system.AppendLine("Schema:");
            system.AppendLine("{\"schemaVersion\":\"society.intent.v1\",\"npcId\":\"...\",\"actionType\":\"Move|Talk|Ask|Observe|Work|Report|Escort|Idle\",\"targetId\":\"optional\",\"locationId\":\"optional\",\"utterance\":\"optional\",\"reasonCodes\":[\"required_reason\"],\"confidence\":0.0}");

            var user = new StringBuilder();
            user.AppendLine("PerceptionPacket JSON:");
            user.AppendLine(JsonUtility.ToJson(packet));
            user.AppendLine("NPC memory summary:");
            user.AppendLine(memory != null ? memory.BuildSummary(maxLines: 6) : "None.");
            user.AppendLine("When actionType is Talk or Ask, utterance must be short Korean text.");

            return new LLMClient.TextRequest
            {
                system = system.ToString(),
                user = user.ToString(),
                maxTokens = 220,
                temperature = 0.5f
            };
        }

        private PerceptionPacket BuildPerceptionPacket(string[] allowedSkills, List<string> observations)
        {
            string[] recentEvents = observations != null
                ? observations.Where(item => !string.IsNullOrWhiteSpace(item)).Take(8).ToArray()
                : Array.Empty<string>();

            string[] nearbyActors = eventLog != null
                ? eventLog.GetRecent(16)
                    .Where(record => record != null && !string.IsNullOrWhiteSpace(record.actorId))
                    .Select(record => record.actorId)
                    .Where(actorId => !string.Equals(actorId, persona.NpcId, StringComparison.Ordinal))
                    .Distinct()
                    .Take(8)
                    .ToArray()
                : Array.Empty<string>();

            string[] allowedActionTypes = ResolveAllowedActionTypes(allowedSkills);
            float elapsedSeconds = sessionDirector != null ? sessionDirector.ElapsedSeconds : 0f;
            string phaseId = sessionArcDirector != null ? sessionArcDirector.CurrentPhaseId : string.Empty;
            float globalSuspicion = globalSuspicionSystem != null ? globalSuspicionSystem.GlobalSuspicion : 0f;
            int exposure = exposureSystem != null ? exposureSystem.Exposure : 0;

            var organizationContext = new OrganizationContextPayload
            {
                role = persona != null ? persona.Role : string.Empty,
                roleId = persona != null ? persona.RoleId.ToString() : string.Empty,
                organizationId = gameObject.scene.name,
                allowedActionTypes = allowedActionTypes
            };

            var playerSignals = new PlayerSignalsPayload
            {
                phase = phaseId,
                elapsedSeconds = elapsedSeconds,
                globalSuspicion = globalSuspicion,
                exposure = exposure
            };

            return new PerceptionPacket
            {
                schemaVersion = SocietyRuntimeContract.PerceptionSchemaVersion,
                sessionId = sessionId,
                npcId = persona.NpcId,
                landmarkId = gameObject.scene.name,
                nearbyActors = nearbyActors,
                recentEvents = recentEvents,
                organizationContext = organizationContext,
                playerSignals = playerSignals,
                allowedActionTypes = allowedActionTypes,
                cognitionPath = string.Empty,
                threadId = string.Empty
            };
        }

        private static string[] ResolveAllowedActionTypes(string[] allowedSkills)
        {
            var allowed = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < BaselineAllowedActionTypes.Length; i++)
            {
                allowed.Add(BaselineAllowedActionTypes[i]);
            }

            if (allowedSkills != null)
            {
                for (int i = 0; i < allowedSkills.Length; i++)
                {
                    switch (allowedSkills[i])
                    {
                        case "Speak":
                            allowed.Add("Talk");
                            allowed.Add("Ask");
                            break;
                        case "MoveToAnchor":
                            allowed.Add("Move");
                            allowed.Add("Escort");
                            break;
                        case "FileReport":
                            allowed.Add("Report");
                            break;
                    }
                }
            }

            return allowed.ToArray();
        }

        private bool TryApplyIntent(NpcIntentPayload intent, string[] allowedSkills, out string blockedReason)
        {
            blockedReason = string.Empty;
            lastOutcome = new ActionOutcome
            {
                success = false,
                blockedReason = string.Empty,
                executedActionType = intent.actionType,
                reasonCodes = intent.reasonCodes ?? Array.Empty<string>()
            };

            string skillId = ResolveSkillId(intent.actionType);
            if (!string.IsNullOrEmpty(skillId) && !IsSkillAllowed(skillId, allowedSkills))
            {
                blockedReason = $"skill_not_allowed:{intent.actionType}";
                lastOutcome.blockedReason = blockedReason;
                RecordContractEvent(CoreEventType.IntentRejected, blockedReason, intent.actionType);
                DeterministicFallback(blockedReason);
                return false;
            }

            if (!HasAuthorityForIntent(intent))
            {
                blockedReason = $"authority_blocked:{intent.actionType}";
                lastOutcome.blockedReason = blockedReason;
                RecordContractEvent(CoreEventType.IntentRejected, blockedReason, intent.actionType);
                DeterministicFallback(blockedReason);
                return false;
            }

            bool success = intent.actionType switch
            {
                "Talk" => ExecuteSpeak(intent.utterance),
                "Ask" => ExecuteSpeak(intent.utterance),
                "Move" => ExecuteMoveToAnchor(intent.locationId),
                "Escort" => ExecuteMoveToAnchor(intent.locationId),
                "Report" => ExecuteFileReport(intent.reasonCodes != null && intent.reasonCodes.Length > 0 ? intent.reasonCodes[0] : string.Empty, intent.targetId),
                "Observe" => true,
                "Work" => true,
                "Idle" => true,
                _ => false
            };

            if (!success)
            {
                blockedReason = $"execution_failed:{intent.actionType}";
                lastOutcome.blockedReason = blockedReason;
                RecordContractEvent(CoreEventType.IntentRejected, blockedReason, intent.actionType);
                DeterministicFallback(blockedReason);
                return false;
            }

            lastOutcome.success = true;
            return true;
        }

        private static string ResolveSkillId(string actionType)
        {
            return actionType switch
            {
                "Talk" => "Speak",
                "Ask" => "Speak",
                "Move" => "MoveToAnchor",
                "Escort" => "MoveToAnchor",
                "Report" => "FileReport",
                _ => string.Empty
            };
        }

        private bool HasAuthorityForIntent(NpcIntentPayload intent)
        {
            if (intent == null)
            {
                return false;
            }

            if (intent.actionType != "Report")
            {
                return true;
            }

            string role = persona != null ? persona.Role : string.Empty;
            if (string.IsNullOrWhiteSpace(role))
            {
                return false;
            }

            for (int i = 0; i < ReportingAuthorityRoleKeywords.Length; i++)
            {
                if (role.IndexOf(ReportingAuthorityRoleKeywords[i], StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return true;
                }
            }

            return false;
        }

        private bool ExecuteSpeak(string text)
        {
            if (string.IsNullOrWhiteSpace(text) || eventLog == null || persona == null)
            {
                return false;
            }

            if (!persona.CanSpeak(Time.time))
            {
                return false;
            }

            persona.MarkSpoke(Time.time);
            eventLog.RecordEvent(new EventRecord
            {
                actorId = persona.NpcId,
                actorRole = persona.Role,
                eventType = CoreEventType.NpcUtterance,
                note = text.Trim(),
                severity = 0
            });
            return true;
        }

        private bool ExecuteMoveToAnchor(string anchorName)
        {
            if (agent == null || !agent.enabled || !agent.isOnNavMesh)
            {
                return false;
            }

            if (string.IsNullOrEmpty(anchorName))
            {
                anchorName = "ParkArea";
            }

            var anchor = GameObject.Find($"CITY_Anchors/{anchorName}");
            if (anchor == null)
            {
                return false;
            }

            if (NavMesh.SamplePosition(anchor.transform.position, out var hit, 2.0f, NavMesh.AllAreas))
            {
                agent.SetDestination(hit.position);
            }
            else
            {
                agent.SetDestination(anchor.transform.position);
            }

            return true;
        }

        private bool ExecuteFileReport(string ruleId, string eventId)
        {
            if (reportManager == null || persona == null)
            {
                return false;
            }

            if (string.IsNullOrEmpty(ruleId))
            {
                ruleId = "R_UNKNOWN";
            }

            reportManager.FileReport(persona.NpcId, ruleId, suspicionSnapshot: 0f, eventId: eventId);
            return true;
        }

        private void DeterministicFallback(string reasonCode)
        {
            if (persona == null)
            {
                return;
            }

            RecordContractEvent(CoreEventType.IntentFallbackApplied, reasonCode, actionType: "Observe");
            // Keep fallback low-noise: only occasionally speak.
            ExecuteSpeak("음... 상황을 좀 더 봐야겠네요.");
        }

        private void RecordBackendDecisionMeta(DecisionMetaPayload meta, NpcIntentPayload intent)
        {
            if (eventLog == null || persona == null || meta == null)
            {
                return;
            }

            string actionType = intent != null ? intent.actionType : string.Empty;
            if (meta.usedFallback)
            {
                string signature = $"{meta.reason}|{meta.reasonCategory}|{meta.warningTier}|{actionType}";
                float suppressWindow = Mathf.Max(0f, fallbackMetaSuppressWindowSeconds);
                if (suppressWindow > 0f
                    && string.Equals(signature, lastFallbackMetaSignature, StringComparison.Ordinal)
                    && (Time.time - lastFallbackMetaLoggedAt) < suppressWindow)
                {
                    suppressedFallbackMetaCount++;
                    return;
                }

                FlushSuppressedFallbackMeta();
                lastFallbackMetaSignature = signature;
                lastFallbackMetaLoggedAt = Time.time;
            }
            else
            {
                FlushSuppressedFallbackMeta();
                lastFallbackMetaSignature = string.Empty;
                lastFallbackMetaLoggedAt = -999f;
            }

            string note = $"transport={meta.transport}; usedFallback={meta.usedFallback}; reason={meta.reason}; reasonCategory={meta.reasonCategory}; warningTier={meta.warningTier}; threadId={meta.threadId}";
            int severity = ResolveMetaSeverity(meta.warningTier, meta.usedFallback);
            eventLog.RecordEvent(new EventRecord
            {
                actorId = persona.NpcId,
                actorRole = persona.Role,
                eventType = CoreEventType.ExplanationGiven,
                topic = string.IsNullOrWhiteSpace(actionType) ? "backend-decision" : $"backend-decision:{actionType}",
                note = note,
                severity = severity
            });
        }

        private void FlushSuppressedFallbackMeta()
        {
            if (suppressedFallbackMetaCount <= 0 || eventLog == null || persona == null)
            {
                suppressedFallbackMetaCount = 0;
                return;
            }

            eventLog.RecordEvent(new EventRecord
            {
                actorId = persona.NpcId,
                actorRole = persona.Role,
                eventType = CoreEventType.ExplanationGiven,
                topic = "backend-decision:noise-suppressed",
                note = $"suppressedFallbackMeta={suppressedFallbackMetaCount}; signature={lastFallbackMetaSignature}",
                severity = 1
            });
            suppressedFallbackMetaCount = 0;
        }

        private static int ResolveMetaSeverity(string warningTier, bool usedFallback)
        {
            if (string.Equals(warningTier, "blocking", StringComparison.Ordinal))
            {
                return 3;
            }

            if (string.Equals(warningTier, "attention", StringComparison.Ordinal))
            {
                return 2;
            }

            if (usedFallback)
            {
                return 2;
            }

            return 1;
        }

        private void RecordContractEvent(CoreEventType eventType, string reasonCode, string actionType)
        {
            if (eventLog == null || persona == null)
            {
                return;
            }

            eventLog.RecordEvent(new EventRecord
            {
                actorId = persona.NpcId,
                actorRole = persona.Role,
                eventType = eventType,
                topic = string.IsNullOrWhiteSpace(actionType) ? "runtime-spec" : actionType,
                note = reasonCode ?? string.Empty,
                severity = 1
            });
        }

        private static bool IsSkillAllowed(string skillId, string[] allowed)
        {
            if (allowed == null || allowed.Length == 0 || string.IsNullOrEmpty(skillId))
            {
                return false;
            }

            for (int i = 0; i < allowed.Length; i++)
            {
                if (string.Equals(allowed[i], skillId, System.StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
