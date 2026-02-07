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
    /// Policy-driven LLM brain loop:
    /// observe(payload) -> decide(JSON) -> validate -> execute -> emit WEL.
    /// </summary>
    public sealed class SocietyBrain : MonoBehaviour
    {
        private static readonly string[] DefaultAllowedActionTypes =
        {
            "Talk",
            "Move",
            "Report",
            "Observe",
            "Idle"
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

            string[] allowedActions = ResolveAllowedActionTypes();
            List<EventRecord> observationRecords = ExtractObservationRecords();
            List<string> observationLines = BuildObservationLines(observationRecords);
            if (observationLines.Count > 0)
            {
                for (int i = 0; i < observationLines.Count; i++)
                {
                    memory.Add($"OBS: {observationLines[i]}");
                }
            }

            SocietyObservationPayload observationPayload = SocietyRuntimeContract.BuildObservationPayload(
                persona,
                transform,
                observationRecords,
                CopyMemoryEntries(),
                allowedActions);

            if (!enableLlmPlanning)
            {
                DeterministicFallback();
                return;
            }

            var request = BuildPlanRequest(allowedActions, observationPayload);

            llmClient.RequestText(request, raw =>
            {
                if (!SocietyJson.TryParseDecision(raw, out var decision, out string error))
                {
                    if (verbose)
                    {
                        Debug.LogWarning($"[SocietyBrain:{persona.NpcId}] decision parse failed: {error}");
                    }
                    DeterministicFallback();
                    return;
                }

                if (!SocietyDecisionValidator.TryValidate(decision, allowedActions, out string rejectReason))
                {
                    if (verbose)
                    {
                        Debug.LogWarning($"[SocietyBrain:{persona.NpcId}] decision rejected: {rejectReason}");
                    }

                    memory.Add($"REJECT: {rejectReason}");
                    DeterministicFallback();
                    return;
                }

                ExecuteDecision(decision, allowedActions);
            });
        }

        private List<EventRecord> ExtractObservationRecords()
        {
            var results = new List<EventRecord>();

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

                results.Add(record);
            }

            return results;
        }

        private List<string> BuildObservationLines(List<EventRecord> records)
        {
            var lines = new List<string>();
            if (records == null || records.Count == 0)
            {
                return lines;
            }

            for (int i = 0; i < records.Count; i++)
            {
                EventRecord record = records[i];
                string text = semanticShaper != null ? semanticShaper.ToText(record) : record.eventType.ToString();
                if (record.eventType == CoreEventType.NpcUtterance && !string.IsNullOrEmpty(record.note))
                {
                    text = $"{record.actorId}: {record.note}";
                }

                lines.Add(text);
            }

            return lines;
        }

        private string[] ResolveAllowedActionTypes()
        {
            if (persona == null)
            {
                return DefaultAllowedActionTypes;
            }

            var roleDef = ResolveRoleDefinition(persona.RoleId);
            if (roleDef != null && roleDef.AllowedSkillIds != null && roleDef.AllowedSkillIds.Length > 0)
            {
                var mapped = new List<string>(roleDef.AllowedSkillIds.Length + 2);
                for (int i = 0; i < roleDef.AllowedSkillIds.Length; i++)
                {
                    string normalized = SocietyRuntimeContract.NormalizeActionType(roleDef.AllowedSkillIds[i]);
                    if (!SocietyRuntimeContract.IsKnownActionType(normalized))
                    {
                        continue;
                    }

                    if (!mapped.Contains(normalized))
                    {
                        mapped.Add(normalized);
                    }
                }

                if (!mapped.Contains("Observe"))
                {
                    mapped.Add("Observe");
                }

                if (!mapped.Contains("Idle"))
                {
                    mapped.Add("Idle");
                }

                return mapped.ToArray();
            }

            return DefaultAllowedActionTypes;
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

        private LLMClient.TextRequest BuildPlanRequest(string[] allowedActions, SocietyObservationPayload observationPayload)
        {
            var system = new StringBuilder();
            system.AppendLine("You are an untrusted planner for an NPC in a social simulation game.");
            system.AppendLine("Return JSON only. No markdown. No extra commentary.");
            system.AppendLine("Your job is to propose 0-2 safe actions that the engine will validate and execute deterministically.");
            system.AppendLine("Do NOT invent evidence. Do NOT change the world directly.");
            system.AppendLine("Schema:");
            system.AppendLine("{\"schemaVersion\":\"society.decision.v1\",\"intent\":\"...\",\"utterance\":\"optional\",\"actions\":[{\"actionType\":\"Move|Talk|Ask|Observe|Work|Report|Escort|Idle\",\"targetId\":\"\",\"locationId\":\"\",\"placeId\":\"\",\"zoneId\":\"\",\"ruleId\":\"\",\"text\":\"\",\"anchorName\":\"\",\"confidence\":0.0}],\"memoryWrite\":\"optional\"}");

            var user = new StringBuilder();
            user.AppendLine($"NPC: {persona.NpcId}");
            user.AppendLine($"Role: {persona.Role}");
            user.AppendLine("Allowed actions: " + string.Join(", ", allowedActions ?? DefaultAllowedActionTypes));
            user.AppendLine("Observation payload JSON:");
            user.AppendLine(SocietyRuntimeContract.ToObservationJson(observationPayload));
            user.AppendLine("Prefer short Korean utterance when the action includes dialogue.");

            return new LLMClient.TextRequest
            {
                system = system.ToString(),
                user = user.ToString(),
                maxTokens = 220,
                temperature = 0.5f
            };
        }

        private void ExecuteDecision(SocietyDecisionPayload decision, string[] allowedActions)
        {
            if (decision == null)
            {
                DeterministicFallback();
                return;
            }

            if (!string.IsNullOrEmpty(decision.memoryWrite))
            {
                memory.Add($"MEM: {decision.memoryWrite}");
            }

            // Convenience: allow a top-level utterance without needing explicit action.
            if (!string.IsNullOrEmpty(decision.utterance))
            {
                if (IsActionAllowed("Talk", allowedActions))
                {
                    ExecuteSpeak(decision.utterance);
                }
                return;
            }

            if (decision.actions == null || decision.actions.Length == 0)
            {
                return;
            }

            int max = Mathf.Min(decision.actions.Length, 2);
            for (int i = 0; i < max; i++)
            {
                var action = decision.actions[i];
                if (action == null)
                {
                    continue;
                }

                string actionType = SocietyRuntimeContract.NormalizeActionType(action.actionType);
                if (!IsActionAllowed(actionType, allowedActions))
                {
                    if (verbose)
                    {
                        Debug.LogWarning($"[SocietyBrain:{persona.NpcId}] action not allowed: {actionType}");
                    }
                    continue;
                }

                if (TryExecuteAction(actionType, action, decision.utterance))
                {
                    return;
                }
            }
        }

        private bool TryExecuteAction(string actionType, SocietyDecisionAction action, string defaultUtterance)
        {
            switch (actionType)
            {
                case "Talk":
                case "Ask":
                    return ExecuteSpeak(string.IsNullOrWhiteSpace(action.text) ? defaultUtterance : action.text);
                case "Move":
                case "Work":
                case "Escort":
                    return ExecuteMoveToAnchor(action.anchorName, action.locationId);
                case "Report":
                    return ExecuteFileReport(action.ruleId, action.targetId);
                case "Observe":
                case "Idle":
                    return true;
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

        private bool ExecuteMoveToAnchor(string anchorName, string locationId)
        {
            if (agent == null || !agent.enabled || !agent.isOnNavMesh)
            {
                return false;
            }

            string resolvedAnchor = !string.IsNullOrWhiteSpace(locationId) ? locationId : anchorName;
            if (string.IsNullOrEmpty(resolvedAnchor))
            {
                resolvedAnchor = "ParkArea";
            }

            var anchor = GameObject.Find($"CITY_Anchors/{resolvedAnchor}");
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

        private static bool IsActionAllowed(string actionType, string[] allowed)
        {
            if (allowed == null || allowed.Length == 0 || string.IsNullOrEmpty(actionType))
            {
                return false;
            }

            for (int i = 0; i < allowed.Length; i++)
            {
                if (string.Equals(allowed[i], actionType, System.StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private string[] CopyMemoryEntries()
        {
            if (memory == null || memory.Entries == null || memory.Entries.Count == 0)
            {
                return System.Array.Empty<string>();
            }

            int count = memory.Entries.Count;
            var copied = new string[count];
            for (int i = 0; i < count; i++)
            {
                copied[i] = memory.Entries[i] ?? string.Empty;
            }

            return copied;
        }
    }
}
