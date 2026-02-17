using System;
using System.Collections.Generic;
using DreamOfOne.Core;
using DreamOfOne.NPC;
using DreamOfOne.UI;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Runtime orchestrator for Cover Tests (v1): listens to WEL events, tracks escalation,
    /// and files reports deterministically. Uses CoverTestDefinition for mapping only.
    /// </summary>
    public sealed class CoverTestRuntime : MonoBehaviour
    {
        private const string CtStoreQueue = "CT_STORE_QUEUE_LANGUAGE";
        private const string CtStoreLabel = "CT_STORE_LABEL_MEANING";
        private const string CtStudioApproval = "CT_STUDIO_APPROVAL_GATE_SPEECH";
        private const string CtParkObservation = "CT_PARK_OBSERVATION_PRESSURE";
        private const string CtStationSoft = "CT_STATION_SOFT_INQUEST";
        private const string CtGlobalContagion = "CT_GLOBAL_REALITY_CHECK_CONTAGION";

        private static readonly Dictionary<string, string> RuleToDetector = new(StringComparer.OrdinalIgnoreCase)
        {
            { "R_QUEUE", DreamLawDetectorIds.ProcQueueSkip },
            { "R_LABEL", DreamLawDetectorIds.ProcLabelTamper },
            { "R_PHOTO", DreamLawDetectorIds.ProcUnauthorizedPhoto },
            { "PROC_RC", DreamLawDetectorIds.ProcRcBeforeApproval },
            { "PROC_RC_SKIP", DreamLawDetectorIds.ProcRcBeforeApproval }
        };

        private static readonly Dictionary<string, string> DetectorToLaw = new(StringComparer.OrdinalIgnoreCase)
        {
            { DreamLawDetectorIds.ProcQueueSkip, "DL_S1_QUEUE_SANCTITY" },
            { DreamLawDetectorIds.ProcLabelTamper, "DL_S2_LABEL_AUTHORITY" },
            { DreamLawDetectorIds.ProcRcBeforeApproval, "DL_ST1_APPROVAL_GATE" },
            { DreamLawDetectorIds.ProcUnauthorizedPhoto, "DL_P1_OBSERVATION_ETIQUETTE" },
            { DreamLawDetectorIds.RepeatLoop, "DL_G4_NO_TIMELINE_PROBING" }
        };

        [SerializeField]
        private CoverTestDatabase coverTestDatabase = null;

        [SerializeField]
        private DreamLawDatabase dreamLawDatabase = null;

        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private ReportManager reportManager = null;

        [SerializeField]
        private ExposureSystem exposureSystem = null;

        [SerializeField]
        private ViolationResponseSystem violationResponse = null;

        [SerializeField]
        private UIManager uiManager = null;

        [Header("Escalation")]
        [SerializeField]
        private bool showStageToasts = true;

        [SerializeField]
        private float triggerCooldownSeconds = 1.5f;

        [SerializeField]
        private float repeatLoopWindowSeconds = 12f;

        [Header("CT-06 Contagion")]
        [SerializeField]
        private bool enableContagion = true;

        [SerializeField]
        private float contagionDelaySeconds = 240f;

        [SerializeField]
        private int contagionExposureThreshold = 40;

        [SerializeField]
        private float contagionWindowSeconds = 18f;

        [SerializeField]
        private float witnessSearchRadius = 6f;

        private sealed class CoverTestState
        {
            public int stage;
            public bool reportFiled;
            public bool defused;
            public bool approvalGranted;
            public float lastTriggerTime;
        }

        private readonly Dictionary<string, List<CoverTestDefinition>> triggerLookup = new(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, CoverTestState> states = new(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, float> lastDetectorTime = new(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, DreamLawDefinition> lawLookup = new(StringComparer.OrdinalIgnoreCase);
        private bool contagionTriggered = false;
        private float contagionExpiresAt = -1f;

        public void Configure(CoverTestDatabase coverTests, DreamLawDatabase dreamLaws)
        {
            coverTestDatabase = coverTests;
            dreamLawDatabase = dreamLaws;
            BuildLookup();
            ConfigureRuleDeltas();
        }

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (reportManager == null)
            {
                reportManager = FindFirstObjectByType<ReportManager>();
            }

            if (exposureSystem == null)
            {
                exposureSystem = FindFirstObjectByType<ExposureSystem>();
            }

            if (violationResponse == null)
            {
                violationResponse = FindFirstObjectByType<ViolationResponseSystem>();
            }

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }

            if (dreamLawDatabase == null)
            {
                var runtime = FindFirstObjectByType<LucidCoverRuntime>();
                if (runtime != null)
                {
                    dreamLawDatabase = runtime.DreamLawDatabase;
                }
            }

            BuildLookup();
            ConfigureRuleDeltas();
        }

        private void OnEnable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded += HandleEvent;
            }
        }

        private void OnDisable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded -= HandleEvent;
            }
        }

        private void Update()
        {
            if (!enableContagion || contagionTriggered)
            {
                return;
            }

            if (exposureSystem != null && exposureSystem.Exposure >= contagionExposureThreshold)
            {
                TriggerContagion();
                return;
            }

            if (Time.time >= contagionDelaySeconds)
            {
                TriggerContagion();
            }
        }

        private void TriggerContagion()
        {
            contagionTriggered = true;
            contagionExpiresAt = Time.time + contagionWindowSeconds;

            var witness = ResolveWitness(transform.position);
            string actorId = witness != null ? witness.NpcId : "NPC";
            string actorRole = witness != null ? witness.Role : "Citizen";
            string note = "Something feels off. Stay procedural.";

            eventLog?.RecordEvent(new EventRecord
            {
                actorId = actorId,
                actorRole = actorRole,
                eventType = CoreEventType.NpcUtterance,
                placeId = "Global",
                topic = CtGlobalContagion,
                note = note,
                severity = 2
            });

            HandleDetectorHit(DreamLawDetectorIds.NpcRealityCheckContagion, actorId, actorRole, "Global", Vector3.zero, CtGlobalContagion);
        }

        private bool IsContagionActive()
        {
            if (!contagionTriggered)
            {
                return false;
            }

            if (contagionExpiresAt <= 0f)
            {
                return true;
            }

            return Time.time <= contagionExpiresAt;
        }

        private void HandleEvent(EventRecord record)
        {
            if (record == null)
            {
                return;
            }

            if (contagionTriggered && contagionExpiresAt > 0f && Time.time > contagionExpiresAt)
            {
                contagionTriggered = false;
                contagionExpiresAt = -1f;
            }

            if (record.eventType == CoreEventType.ViolationDetected)
            {
                TryEmitRepeatLoop(record);
            }

            string detectorId = ResolveDetectorId(record);
            if (!string.IsNullOrEmpty(detectorId))
            {
                HandleDetectorHit(detectorId, record.actorId, record.actorRole, record.placeId, record.position, record.ruleId);
            }

            HandleDefuse(record);
        }

        private void TryEmitRepeatLoop(EventRecord record)
        {
            string detectorId = !string.IsNullOrEmpty(record.sourceId) ? record.sourceId : ResolveDetectorFromRule(record.ruleId);
            if (string.IsNullOrEmpty(detectorId))
            {
                return;
            }

            float now = Time.time;
            if (lastDetectorTime.TryGetValue(detectorId, out float last) && now - last <= repeatLoopWindowSeconds)
            {
                HandleDetectorHit(DreamLawDetectorIds.RepeatLoop, record.actorId, record.actorRole, record.placeId, record.position, record.ruleId);
            }

            lastDetectorTime[detectorId] = now;
        }

        private string ResolveDetectorId(EventRecord record)
        {
            if (record.eventType == CoreEventType.ViolationDetected)
            {
                if (!string.IsNullOrEmpty(record.sourceId))
                {
                    return record.sourceId;
                }

                return ResolveDetectorFromRule(record.ruleId);
            }

            if (record.eventType == CoreEventType.LabelChanged)
            {
                return DreamLawDetectorIds.ProcLabelTamper;
            }

            if (record.eventType == CoreEventType.RcInserted)
            {
                var state = GetState(CtStudioApproval);
                if (state == null || !state.approvalGranted)
                {
                    return DreamLawDetectorIds.ProcRcBeforeApproval;
                }
            }

            return string.Empty;
        }

        private static string ResolveDetectorFromRule(string ruleId)
        {
            if (string.IsNullOrEmpty(ruleId))
            {
                return string.Empty;
            }

            return RuleToDetector.TryGetValue(ruleId, out var detector) ? detector : string.Empty;
        }

        private void HandleDetectorHit(string detectorId, string actorId, string actorRole, string placeId, Vector3 position, string ruleId)
        {
            if (string.IsNullOrEmpty(detectorId))
            {
                return;
            }

            if (!triggerLookup.TryGetValue(detectorId, out var tests))
            {
                return;
            }

            if (IsProcedureDetector(detectorId))
            {
                ApplyProcedureEvidence(detectorId, actorId, actorRole, placeId, position, ruleId);
            }

            for (int i = 0; i < tests.Count; i++)
            {
                var test = tests[i];
                if (test == null)
                {
                    continue;
                }

                if (string.Equals(test.CoverTestId, CtGlobalContagion, StringComparison.OrdinalIgnoreCase)
                    && !IsContagionActive())
                {
                    continue;
                }

                AdvanceTest(test, detectorId, actorId, actorRole, placeId, position);
            }
        }

        private void AdvanceTest(CoverTestDefinition definition, string detectorId, string actorId, string actorRole, string placeId, Vector3 position)
        {
            if (definition == null)
            {
                return;
            }

            var state = GetState(definition.CoverTestId);
            if (state == null)
            {
                return;
            }

            float now = Time.time;
            if (now - state.lastTriggerTime < triggerCooldownSeconds)
            {
                return;
            }

            state.lastTriggerTime = now;
            state.defused = false;
            state.stage = Mathf.Clamp(state.stage + 1, 1, 3);

            RecordStage(definition, state.stage, detectorId, actorId, actorRole, placeId, position);

            if (state.stage >= 3)
            {
                TryFileReport(definition, state, actorId, actorRole, placeId, position, detectorId);
            }
        }

        private void RecordStage(CoverTestDefinition definition, int stage, string detectorId, string actorId, string actorRole, string placeId, Vector3 position)
        {
            string stageLabel = stage switch
            {
                1 => "Suspicious",
                2 => "Challenging",
                _ => "Reporting"
            };

            if (showStageToasts && uiManager != null)
            {
                uiManager.ShowToast($"{definition.CoverTestId}: {stageLabel}", 1.5f);
            }

            eventLog?.RecordEvent(new EventRecord
            {
                actorId = string.IsNullOrEmpty(actorId) ? "NPC" : actorId,
                actorRole = string.IsNullOrEmpty(actorRole) ? "Citizen" : actorRole,
                eventType = CoreEventType.NpcUtterance,
                placeId = placeId ?? string.Empty,
                topic = definition.CoverTestId,
                note = $"{stageLabel} (det={detectorId})",
                severity = stage >= 3 ? 3 : 2,
                position = position
            });
        }

        private void TryFileReport(CoverTestDefinition definition, CoverTestState state, string actorId, string actorRole, string placeId, Vector3 position, string detectorId)
        {
            if (state == null || state.reportFiled || reportManager == null)
            {
                return;
            }

            string reporterId = !string.IsNullOrEmpty(actorId) ? actorId : "Witness";
            reportManager.FileReport(reporterId, string.IsNullOrEmpty(detectorId) ? definition.CoverTestId : detectorId, 60f, eventId: string.Empty, position: position);
            state.reportFiled = true;
        }

        private void HandleDefuse(EventRecord record)
        {
            if (record == null)
            {
                return;
            }

            if (record.eventType == CoreEventType.QueueUpdated || record.eventType == CoreEventType.TicketIssued)
            {
                ApplyDefuse(CtStoreQueue, record);
                return;
            }

            if (record.eventType == CoreEventType.ExplanationGiven)
            {
                if (string.Equals(record.placeId, "Store", StringComparison.OrdinalIgnoreCase))
                {
                    ApplyDefuse(CtStoreQueue, record);
                    ApplyDefuse(CtStoreLabel, record);
                }
                else if (string.Equals(record.placeId, "Station", StringComparison.OrdinalIgnoreCase))
                {
                    ApplyDefuse(CtStationSoft, record);
                }
                return;
            }

            if (record.eventType == CoreEventType.ApprovalGranted)
            {
                var state = GetState(CtStudioApproval);
                if (state != null)
                {
                    state.approvalGranted = true;
                }
                ApplyDefuse(CtStudioApproval, record);
                return;
            }

            if (record.eventType == CoreEventType.EvidenceCaptured && string.Equals(record.placeId, "Park", StringComparison.OrdinalIgnoreCase))
            {
                ApplyDefuse(CtParkObservation, record);
            }
        }

        private void ApplyDefuse(string coverTestId, EventRecord record)
        {
            var state = GetState(coverTestId);
            if (state == null)
            {
                return;
            }

            state.defused = true;
            state.stage = Mathf.Max(0, state.stage - 1);
            state.lastTriggerTime = Time.time;

            if (showStageToasts && uiManager != null)
            {
                uiManager.ShowToast($"{coverTestId}: Defused", 1.2f);
            }

            eventLog?.RecordEvent(new EventRecord
            {
                actorId = "System",
                actorRole = "System",
                eventType = CoreEventType.TaskCompleted,
                placeId = record.placeId,
                topic = coverTestId,
                note = "Defuse",
                severity = 1,
                position = record.position
            });
        }

        private void ApplyProcedureEvidence(string detectorId, string actorId, string actorRole, string placeId, Vector3 position, string ruleId)
        {
            string lawId = DetectorToLaw.TryGetValue(detectorId, out var mappedLaw) ? mappedLaw : string.Empty;

            var witness = ResolveWitness(position);
            string witnessId = witness != null ? witness.NpcId : "Witness";
            string witnessRole = witness != null ? witness.Role : "Citizen";

            string statementNote = !string.IsNullOrEmpty(lawId)
                ? $"{lawId} witness statement."
                : "Procedure witness statement.";

            ArtifactFactory.RecordWitnessStatement(
                eventLog,
                witnessId,
                witnessRole,
                string.IsNullOrEmpty(lawId) ? ruleId : lawId,
                detectorId,
                placeId,
                statementNote,
                position);

            if (exposureSystem != null && !string.IsNullOrEmpty(lawId) && lawLookup.TryGetValue(lawId, out var law))
            {
                if (law.ExposureDelta > 0)
                {
                    exposureSystem.AddExposure(law.ExposureDelta, witnessId, placeId, law.DreamLawId, detectorId, position);
                }
            }

            if (eventLog != null && RequiresViolationEvent(detectorId))
            {
                eventLog.RecordEvent(new EventRecord
                {
                    actorId = witnessId,
                    actorRole = witnessRole,
                    targetId = "PLAYER",
                    eventType = CoreEventType.ViolationDetected,
                    ruleId = string.IsNullOrEmpty(lawId) ? ruleId : lawId,
                    sourceId = detectorId,
                    topic = string.IsNullOrEmpty(lawId) ? ruleId : lawId,
                    note = $"det={detectorId}",
                    severity = 2,
                    placeId = placeId,
                    position = position
                });
            }
        }

        private static bool RequiresViolationEvent(string detectorId)
        {
            return string.Equals(detectorId, DreamLawDetectorIds.ProcLabelTamper, StringComparison.OrdinalIgnoreCase)
                || string.Equals(detectorId, DreamLawDetectorIds.ProcRcBeforeApproval, StringComparison.OrdinalIgnoreCase);
        }

        private void BuildLookup()
        {
            triggerLookup.Clear();
            states.Clear();

            if (coverTestDatabase == null || coverTestDatabase.CoverTests == null)
            {
                return;
            }

            foreach (var test in coverTestDatabase.CoverTests)
            {
                if (test == null || string.IsNullOrEmpty(test.CoverTestId))
                {
                    continue;
                }

                states[test.CoverTestId] = new CoverTestState();

                var detectors = test.TriggerDetectorIds;
                if (detectors == null)
                {
                    continue;
                }

                for (int i = 0; i < detectors.Length; i++)
                {
                    string detector = detectors[i];
                    if (string.IsNullOrEmpty(detector))
                    {
                        continue;
                    }

                    if (!triggerLookup.TryGetValue(detector, out var list))
                    {
                        list = new List<CoverTestDefinition>();
                        triggerLookup[detector] = list;
                    }

                    if (!list.Contains(test))
                    {
                        list.Add(test);
                    }
                }
            }

            BuildLawLookup();
        }

        private void BuildLawLookup()
        {
            lawLookup.Clear();
            if (dreamLawDatabase == null || dreamLawDatabase.DreamLaws == null)
            {
                return;
            }

            foreach (var law in dreamLawDatabase.DreamLaws)
            {
                if (law == null || string.IsNullOrEmpty(law.DreamLawId))
                {
                    continue;
                }

                lawLookup[law.DreamLawId] = law;
            }
        }

        private void ConfigureRuleDeltas()
        {
            if (violationResponse == null || dreamLawDatabase == null || dreamLawDatabase.DreamLaws == null)
            {
                return;
            }

            foreach (var law in dreamLawDatabase.DreamLaws)
            {
                if (law == null || string.IsNullOrEmpty(law.DreamLawId))
                {
                    continue;
                }

                violationResponse.ConfigureRuleDelta(law.DreamLawId, law.SuspicionDelta);
            }

            // Map legacy rule ids used by existing interactables to their v1 deltas.
            violationResponse.ConfigureRuleDelta("R_QUEUE", 12f);
            violationResponse.ConfigureRuleDelta("R_LABEL", 18f);
            violationResponse.ConfigureRuleDelta("R_PHOTO", 12f);
            violationResponse.ConfigureRuleDelta("PROC_RC", 15f);
            violationResponse.ConfigureRuleDelta("PROC_RC_SKIP", 15f);
        }

        private CoverTestState GetState(string coverTestId)
        {
            if (string.IsNullOrEmpty(coverTestId))
            {
                return null;
            }

            states.TryGetValue(coverTestId, out var state);
            return state;
        }

        private NpcPersona ResolveWitness(Vector3 origin)
        {
            float radius = Mathf.Max(0.1f, witnessSearchRadius);
            float bestSqr = radius * radius;
            NpcPersona best = null;

            var personas = FindObjectsByType<NpcPersona>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            for (int i = 0; i < personas.Length; i++)
            {
                var persona = personas[i];
                if (persona == null)
                {
                    continue;
                }

                float sqr = (persona.transform.position - origin).sqrMagnitude;
                if (sqr < bestSqr)
                {
                    bestSqr = sqr;
                    best = persona;
                }
            }

            return best;
        }

        private static bool IsProcedureDetector(string detectorId)
        {
            return !string.IsNullOrEmpty(detectorId)
                && detectorId.StartsWith("DET_PROC_", StringComparison.OrdinalIgnoreCase);
        }
    }
}
