using System.Collections.Generic;
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
        [Tooltip("Debug logs for plan parse/validation.")]
        private bool verbose = false;

        private PolicyPackDefinition policyPack = null;
        private WorldEventLog eventLog = null;
        private LLMClient llmClient = null;
        private ReportManager reportManager = null;
        private SemanticShaper semanticShaper = null;

        private NpcPersona persona = null;
        private NavMeshAgent agent = null;
        private SocietyMemory memory = null;

        private float nextDecisionTime = -999f;
        private readonly HashSet<string> seenEventIds = new();

        public void Configure(PolicyPackDefinition pack, WorldEventLog log, LLMClient llm, ReportManager reports, SemanticShaper shaper)
        {
            policyPack = pack;
            eventLog = log;
            llmClient = llm;
            reportManager = reports;
            semanticShaper = shaper;
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
        }

        private void Start()
        {
            nextDecisionTime = Time.time + Random.Range(1f, decisionIntervalSeconds);
        }

        private void Update()
        {
            if (persona == null || eventLog == null || llmClient == null)
            {
                return;
            }

            if (Time.time < nextDecisionTime)
            {
                return;
            }

            nextDecisionTime = Time.time + decisionIntervalSeconds + Random.Range(-0.5f, 0.8f);

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
                DeterministicFallback();
                return;
            }

            var allowed = ResolveAllowedSkills();
            var request = BuildPlanRequest(allowed, observations);

            llmClient.RequestText(request, raw =>
            {
                if (!SocietyJson.TryParsePlan(raw, out var plan, out string error))
                {
                    if (verbose)
                    {
                        Debug.LogWarning($"[SocietyBrain:{persona.NpcId}] plan parse failed: {error}");
                    }
                    DeterministicFallback();
                    return;
                }

                ExecutePlan(plan, allowed);
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

            var roleDef = ResolveRoleDefinition(persona.Role);
            if (roleDef != null && roleDef.AllowedSkillIds != null && roleDef.AllowedSkillIds.Length > 0)
            {
                return roleDef.AllowedSkillIds;
            }

            return DefaultAllowedSkills;
        }

        private RoleDefinition ResolveRoleDefinition(string roleId)
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

                if (string.Equals(role.RoleId, roleId, System.StringComparison.OrdinalIgnoreCase))
                {
                    return role;
                }
            }

            return null;
        }

        private LLMClient.TextRequest BuildPlanRequest(string[] allowedSkills, List<string> observations)
        {
            var system = new StringBuilder();
            system.AppendLine("You are an untrusted planner for an NPC in a social simulation game.");
            system.AppendLine("Return JSON only. No markdown. No extra commentary.");
            system.AppendLine("Your job is to propose 0-2 safe actions that the engine will validate and execute deterministically.");
            system.AppendLine("Do NOT invent evidence. Do NOT change the world directly.");
            system.AppendLine("Schema:");
            system.AppendLine("{\"intent\":\"...\",\"speak\":\"optional\",\"actions\":[{\"type\":\"SkillId\",\"targetId\":\"\",\"placeId\":\"\",\"zoneId\":\"\",\"ruleId\":\"\",\"text\":\"\",\"anchorName\":\"\"}],\"memoryWrite\":\"optional\"}");

            var user = new StringBuilder();
            user.AppendLine($"NPC: {persona.NpcId}");
            user.AppendLine($"Role: {persona.Role}");
            user.AppendLine("Allowed skills: " + string.Join(", ", allowedSkills ?? DefaultAllowedSkills));
            user.AppendLine("Recent observations:");
            if (observations != null && observations.Count > 0)
            {
                for (int i = 0; i < observations.Count; i++)
                {
                    user.AppendLine($"- {observations[i]}");
                }
            }
            else
            {
                user.AppendLine("- None");
            }

            user.AppendLine("Your memory:");
            user.AppendLine(memory != null ? memory.BuildSummary(maxLines: 6) : "None.");

            user.AppendLine("Prefer short Korean for speak text when you speak.");

            return new LLMClient.TextRequest
            {
                system = system.ToString(),
                user = user.ToString(),
                maxTokens = 220,
                temperature = 0.5f
            };
        }

        private void ExecutePlan(SocietyActionPlan plan, string[] allowedSkills)
        {
            if (plan == null)
            {
                DeterministicFallback();
                return;
            }

            if (!string.IsNullOrEmpty(plan.memoryWrite))
            {
                memory.Add($"MEM: {plan.memoryWrite}");
            }

            // Convenience: allow a top-level "speak" without needing a Speak action.
            if (!string.IsNullOrEmpty(plan.speak))
            {
                if (IsSkillAllowed("Speak", allowedSkills))
                {
                    ExecuteSpeak(plan.speak);
                }
                return;
            }

            if (plan.actions == null || plan.actions.Length == 0)
            {
                return;
            }

            int max = Mathf.Min(plan.actions.Length, 2);
            for (int i = 0; i < max; i++)
            {
                var action = plan.actions[i];
                if (action == null || string.IsNullOrEmpty(action.type))
                {
                    continue;
                }

                if (!IsSkillAllowed(action.type, allowedSkills))
                {
                    if (verbose)
                    {
                        Debug.LogWarning($"[SocietyBrain:{persona.NpcId}] skill not allowed: {action.type}");
                    }
                    continue;
                }

                if (TryExecuteAction(action))
                {
                    return;
                }
            }
        }

        private bool TryExecuteAction(SocietyAction action)
        {
            switch (action.type)
            {
                case "Speak":
                    return ExecuteSpeak(action.text);
                case "MoveToAnchor":
                    return ExecuteMoveToAnchor(action.anchorName);
                case "FileReport":
                    return ExecuteFileReport(action.ruleId, action.targetId);
                default:
                    return false;
            }
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

        private void DeterministicFallback()
        {
            if (persona == null)
            {
                return;
            }

            // Keep fallback low-noise: only occasionally speak.
            ExecuteSpeak("음... 상황을 좀 더 봐야겠네요.");
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
