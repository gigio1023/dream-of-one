using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using DreamOfOne.Core;
using DreamOfOne.NPC;
using DreamOfOne.UI;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.PlayModeTests
{
    public sealed class SessionPlayModeTests
    {
        [UnitySetUp]
        public IEnumerator LoadPrototypeScene()
        {
            RuntimeNavMeshBaker.SkipRuntimeBakeForTests = true;
            if (SceneManager.GetActiveScene().name != "Prototype")
            {
                var op = SceneManager.LoadSceneAsync("Prototype", LoadSceneMode.Single);
                while (op != null && !op.isDone)
                {
                    yield return null;
                }
            }

            yield return null;
        }

        [TearDown]
        public void ResetRuntimeBakeFlag()
        {
            RuntimeNavMeshBaker.SkipRuntimeBakeForTests = false;
        }

        [UnityTest]
        public IEnumerator SceneHasCoreSystems()
        {
            yield return null;
            Assert.NotNull(Object.FindFirstObjectByType<WorldEventLog>(), "WorldEventLog missing");
            Assert.NotNull(Object.FindFirstObjectByType<SemanticShaper>(), "SemanticShaper missing");
            Assert.NotNull(Object.FindFirstObjectByType<UIManager>(), "UIManager missing");
            Assert.NotNull(Object.FindFirstObjectByType<SessionDirector>(), "SessionDirector missing");
            Assert.NotNull(GameObject.Find("World_Built"), "World_Built missing");
        }

        [UnityTest]
        public IEnumerator PerformanceGateComponentsPresent()
        {
            yield return null;
            Assert.NotNull(Object.FindFirstObjectByType<PerformanceProbe>(FindObjectsInactive.Include), "PerformanceProbe missing");
            Assert.NotNull(Object.FindFirstObjectByType<GcAllocationProbe>(FindObjectsInactive.Include), "GcAllocationProbe missing");
            Assert.NotNull(Object.FindFirstObjectByType<RuntimeDiagnostics>(FindObjectsInactive.Include), "RuntimeDiagnostics missing");
            Assert.NotNull(Object.FindFirstObjectByType<LoopVerifier>(FindObjectsInactive.Include), "LoopVerifier missing");
        }

        [UnityTest]
        public IEnumerator PortalRoundTripRestoresAgent()
        {
            var npc = Object.FindObjectsByType<NavMeshAgent>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(agent => agent != null && agent.enabled && agent.gameObject.CompareTag("Player") == false);
            var portals = Object.FindObjectsByType<InteriorPortal>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            var exterior = portals.FirstOrDefault(p => p != null && p.MarksInside == false);
            var interior = portals.FirstOrDefault(p => p != null && p.MarksInside == true);

            Assert.NotNull(npc, "NavMeshAgent NPC not found");
            Assert.NotNull(exterior, "Exterior portal missing");
            Assert.NotNull(interior, "Interior portal missing");

            exterior.ForceTeleport(npc.gameObject);
            yield return null;
            Assert.IsFalse(npc.enabled, "NPC agent should be disabled after interior entry");

            interior.ForceTeleport(npc.gameObject);
            yield return null;
            Assert.IsTrue(npc.enabled, "NPC agent should be re-enabled after exterior return");
        }

        [UnityTest]
        public IEnumerator RumorConfirmedWithEvidence()
        {
            var root = new GameObject("RumorTest");
            var log = root.AddComponent<WorldEventLog>();
            var shaper = root.AddComponent<SemanticShaper>();
            var gossip = root.AddComponent<GossipSystem>();
            gossip.enabled = false;

            SetPrivateField(gossip, "eventLog", log);
            SetPrivateField(gossip, "semanticShaper", shaper);
            SetPrivateField(gossip, "gossipDelaySeconds", 0.01f);
            SetPrivateField(gossip, "gossipCooldownSeconds", 0f);
            SetPrivateField(gossip, "talkDistance", 10f);
            gossip.enabled = true;

            var npcA = new GameObject("NPC_A");
            npcA.transform.position = Vector3.zero;
            npcA.AddComponent<NpcPersona>();
            npcA.AddComponent<NpcContext>();

            var npcB = new GameObject("NPC_B");
            npcB.transform.position = new Vector3(1f, 0f, 0f);
            npcB.AddComponent<NpcPersona>();
            npcB.AddComponent<NpcContext>();

            var violation = new EventRecord
            {
                actorId = "Player",
                actorRole = "Player",
                eventType = CoreEventType.ViolationDetected,
                category = EventCategory.Rule,
                ruleId = "R_QUEUE",
                topic = "R_QUEUE",
                placeId = "Store",
                zoneId = "StoreQueue",
                position = Vector3.zero,
                severity = 2,
                note = "test"
            };
            log.RecordEvent(violation);

            yield return new WaitForSeconds(0.05f);

            log.RecordEvent(new EventRecord
            {
                actorId = "Clerk",
                actorRole = "Clerk",
                eventType = CoreEventType.EvidenceCaptured,
                category = EventCategory.Evidence,
                ruleId = "R_QUEUE",
                topic = "R_QUEUE",
                placeId = "Store",
                zoneId = "StoreQueue",
                position = Vector3.zero,
                severity = 2,
                note = "evidence"
            });

            yield return null;

            bool confirmed = log.Events.Any(e => e != null && e.eventType == CoreEventType.RumorConfirmed);
            Object.Destroy(root);
            Object.Destroy(npcA);
            Object.Destroy(npcB);
            Assert.IsTrue(confirmed, "Rumor was not confirmed with evidence");
        }

        [UnityTest]
        public IEnumerator ShortRunHasNonMovementEventAndNoErrors()
        {
            var log = Object.FindFirstObjectByType<WorldEventLog>();
            Assert.NotNull(log, "WorldEventLog missing");

            var errors = new List<string>();
            void HandleLog(string condition, string stackTrace, LogType type)
            {
                if (type == LogType.Error || type == LogType.Exception || type == LogType.Assert)
                {
                    errors.Add(condition);
                }
            }

            Application.logMessageReceived += HandleLog;
            try
            {
                yield return new WaitForSeconds(1f);

                log.RecordEvent(new EventRecord
                {
                    actorId = "TestRunner",
                    actorRole = "Test",
                    eventType = CoreEventType.EvidenceCaptured,
                    category = EventCategory.Evidence,
                    ruleId = "R_TEST",
                    topic = "R_TEST",
                    placeId = "Test",
                    zoneId = "TestZone",
                    position = Vector3.zero,
                    severity = 1,
                    note = "smoke"
                });

                yield return null;
            }
            finally
            {
                Application.logMessageReceived -= HandleLog;
            }

            bool hasNonMovement = log.Events.Any(e => e != null && e.eventType != CoreEventType.EnteredZone && e.eventType != CoreEventType.ExitedZone);
            Assert.IsTrue(hasNonMovement, "No non-movement events recorded during short run");
            Assert.IsTrue(errors.Count == 0, $"Errors during short run: {string.Join("\\n", errors)}");
        }

        [UnityTest]
        public IEnumerator DoDChecklistSignals()
        {
            var log = Object.FindFirstObjectByType<WorldEventLog>();
            var artifacts = Object.FindFirstObjectByType<ArtifactSystem>();
            Assert.NotNull(log, "WorldEventLog missing");
            Assert.NotNull(artifacts, "ArtifactSystem missing");

            log.ResetLog();
            artifacts.ResetArtifacts();

            var errors = new List<string>();
            void HandleLog(string condition, string stackTrace, LogType type)
            {
                if (type == LogType.Error || type == LogType.Exception || type == LogType.Assert)
                {
                    errors.Add(condition);
                }
            }

            Application.logMessageReceived += HandleLog;
            var records = new List<EventRecord>
            {
                new EventRecord { actorId = "Player", actorRole = "Player", eventType = CoreEventType.ViolationDetected, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 2, note = "violation" },
                new EventRecord { actorId = "Cam01", actorRole = "System", eventType = CoreEventType.CctvCaptured, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "cctv" },
                new EventRecord { actorId = "ClerkA", actorRole = "Clerk", eventType = CoreEventType.ReportFiled, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "report" },
                new EventRecord { actorId = "WitnessA", actorRole = "Clerk", eventType = CoreEventType.StatementGiven, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "statement" },
                new EventRecord { actorId = "WitnessB", actorRole = "QA", eventType = CoreEventType.ExplanationGiven, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "explanation" },
                new EventRecord { actorId = "WitnessC", actorRole = "PM", eventType = CoreEventType.RebuttalGiven, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "rebuttal" },
                new EventRecord { actorId = "GossipA", actorRole = "Citizen", eventType = CoreEventType.RumorShared, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "rumor" },
                new EventRecord { actorId = "GossipB", actorRole = "Citizen", eventType = CoreEventType.RumorConfirmed, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "confirmed" },
                new EventRecord { actorId = "OfficerA", actorRole = "Officer", eventType = CoreEventType.TicketIssued, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "ticket" },
                new EventRecord { actorId = "OfficerB", actorRole = "Officer", eventType = CoreEventType.EvidenceCaptured, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Store", zoneId = "StoreQueue", severity = 1, note = "evidence" },
                new EventRecord { actorId = "ProcA", actorRole = "System", eventType = CoreEventType.TaskStarted, ruleId = "PROC_A", topic = "PROC_A", placeId = "Station", zoneId = "StationDesk", severity = 1, note = "task start" },
                new EventRecord { actorId = "ProcB", actorRole = "System", eventType = CoreEventType.TaskCompleted, ruleId = "PROC_B", topic = "PROC_B", placeId = "Station", zoneId = "StationDesk", severity = 1, note = "task complete" },
                new EventRecord { actorId = "OfficerC", actorRole = "Officer", eventType = CoreEventType.VerdictGiven, ruleId = "R_QUEUE", topic = "R_QUEUE", placeId = "Station", zoneId = "StationDesk", severity = 2, note = "verdict" }
            };

            try
            {
                foreach (var record in records)
                {
                    log.RecordEvent(record);
                }

                yield return null;
            }
            finally
            {
                Application.logMessageReceived -= HandleLog;
            }

            int meaningfulEvents = log.Events.Count(e => e != null && e.eventType != CoreEventType.EnteredZone && e.eventType != CoreEventType.ExitedZone);
            Assert.GreaterOrEqual(meaningfulEvents, 12, $"Meaningful events below target: {meaningfulEvents}");

            int socialEvents = log.Events.Count(e => e != null && (
                e.eventType == CoreEventType.ReportFiled
                || e.eventType == CoreEventType.RumorShared
                || e.eventType == CoreEventType.RumorConfirmed
                || e.eventType == CoreEventType.StatementGiven
                || e.eventType == CoreEventType.ExplanationGiven
                || e.eventType == CoreEventType.RebuttalGiven));
            Assert.GreaterOrEqual(socialEvents, 6, $"Social reaction events below target: {socialEvents}");

            Assert.GreaterOrEqual(artifacts.GetArtifacts().Count, 3, "Artifacts below target");

            var report = new ReportEnvelope
            {
                reportId = "TEST_REPORT",
                topic = "R_QUEUE",
                placeId = "Store",
                zoneId = "StoreQueue"
            };
            report.attachedEventIds.AddRange(records
                .Where(r => r.eventType == CoreEventType.StatementGiven
                    || r.eventType == CoreEventType.ExplanationGiven
                    || r.eventType == CoreEventType.RebuttalGiven)
                .Select(r => r.id));

            var builder = new CaseBundleBuilder(log, 80);
            var bundle = builder.Build(report);
            Assert.GreaterOrEqual(bundle.statements.Count, 1, "Statements missing in bundle");
            Assert.GreaterOrEqual(bundle.explanations.Count, 1, "Explanations missing in bundle");
            Assert.GreaterOrEqual(bundle.rebuttals.Count, 1, "Rebuttals missing in bundle");
            Assert.IsTrue(errors.Count == 0, $"Errors during DoD smoke: {string.Join("\\n", errors)}");
        }

        [Test]
        public void CanonicalLineIsCapped()
        {
            var shaper = new GameObject("Shaper").AddComponent<SemanticShaper>();
            var record = new EventRecord
            {
                actorId = "Player",
                eventType = CoreEventType.ViolationDetected,
                ruleId = "R_QUEUE",
                note = new string('A', 200)
            };
            string line = shaper.ToText(record);
            Object.DestroyImmediate(shaper.gameObject);
            Assert.LessOrEqual(line.Length, 80, "Canonical line exceeds 80 chars");
        }

        [Test]
        public void CaseBundleScoreDeterministic()
        {
            var logObject = new GameObject("CaseLog");
            var log = logObject.AddComponent<WorldEventLog>();

            var violation = new EventRecord
            {
                actorId = "Player",
                actorRole = "Player",
                eventType = CoreEventType.ViolationDetected,
                category = EventCategory.Rule,
                ruleId = "R_QUEUE",
                topic = "R_QUEUE",
                placeId = "Store",
                zoneId = "StoreQueue",
                severity = 2,
                note = "test"
            };
            log.RecordEvent(violation);

            var report = new ReportEnvelope
            {
                reportId = "R1",
                ruleId = "R_QUEUE",
                topic = "R_QUEUE",
                placeId = "Store",
                zoneId = "StoreQueue",
                attachedEventIds = new List<string> { violation.id }
            };

            var builder = new CaseBundleBuilder(log);
            var first = builder.Build(report);
            var second = builder.Build(report);

            Object.DestroyImmediate(logObject);
            Assert.AreEqual(first.Score, second.Score, "CaseBundle score is not deterministic");
        }

        [Test]
        public void CaseVerdictDeterministic()
        {
            var logObject = new GameObject("CaseVerdictLog");
            var log = logObject.AddComponent<WorldEventLog>();

            var violation = new EventRecord
            {
                actorId = "Player",
                actorRole = "Player",
                eventType = CoreEventType.ViolationDetected,
                category = EventCategory.Rule,
                ruleId = "R_QUEUE",
                topic = "R_QUEUE",
                placeId = "Store",
                zoneId = "StoreQueue",
                severity = 2,
                note = "test"
            };
            log.RecordEvent(violation);

            var report = new ReportEnvelope
            {
                reportId = "R2",
                ruleId = "R_QUEUE",
                topic = "R_QUEUE",
                placeId = "Store",
                zoneId = "StoreQueue",
                attachedEventIds = new List<string> { violation.id }
            };

            var builder = new CaseBundleBuilder(log);
            var bundle = builder.Build(report);

            string verdictA = CaseVerdict.DetermineVerdict(bundle, out string reasonA);
            string verdictB = CaseVerdict.DetermineVerdict(bundle, out string reasonB);

            Object.DestroyImmediate(logObject);
            Assert.AreEqual(verdictA, verdictB, "Case verdict is not deterministic");
            Assert.AreEqual(reasonA, reasonB, "Verdict reason is not deterministic");
        }

        [UnityTest]
        public IEnumerator CharactersStayAboveGround()
        {
            yield return null;

            var player = GameObject.FindGameObjectWithTag("Player");
            Assert.NotNull(player, "Player not found");
            AssertRendererAboveGround(player, "Player");

            var npcAgent = Object.FindObjectsByType<NavMeshAgent>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(agent => agent != null && agent.gameObject.CompareTag("Player") == false);
            Assert.NotNull(npcAgent, "NPC NavMeshAgent not found");
            AssertRendererAboveGround(npcAgent.gameObject, "NPC");
        }

        [UnityTest]
        public IEnumerator ArtifactDefinitionsApplyToEvents()
        {
            var root = new GameObject("ArtifactTest");
            var log = root.AddComponent<WorldEventLog>();
            var artifactSystem = root.AddComponent<ArtifactSystem>();

            var record = new EventRecord
            {
                actorId = "Tester",
                actorRole = "Citizen",
                eventType = CoreEventType.ReportFiled,
                category = EventCategory.Report,
                ruleId = "R_QUEUE",
                note = "complaint",
                placeId = "Store",
                zoneId = "StoreQueue",
                position = Vector3.zero,
                severity = 2
            };

            log.RecordEvent(record);
            yield return null;

            var artifacts = artifactSystem.GetArtifacts();
            Assert.IsTrue(artifacts.Count > 0, "Artifact not created for ReportFiled");
            Assert.IsFalse(string.IsNullOrEmpty(artifacts[0].ArtifactId), "ArtifactId missing");
            Assert.IsFalse(string.IsNullOrEmpty(artifacts[0].InspectText), "InspectText missing");

            Object.Destroy(root);
        }

        private static void AssertRendererAboveGround(GameObject target, string label)
        {
            var renderers = target.GetComponentsInChildren<Renderer>(true);
            var renderer = renderers.FirstOrDefault(r => r != null && r.enabled) ?? renderers.FirstOrDefault();
            Assert.NotNull(renderer, $"{label} Renderer not found");

            Vector3 rayOrigin = target.transform.position + Vector3.up * 2f;
            var hits = Physics.RaycastAll(rayOrigin, Vector3.down, 10f);
            Assert.IsTrue(hits.Length > 0, $"{label} ground raycast failed");

            float groundY = hits.Min(hit => hit.point.y);
            float minY = renderer.bounds.min.y;
            Assert.GreaterOrEqual(minY, groundY - 0.05f, $"{label} sunk below ground (minY={minY:0.000}, groundY={groundY:0.000})");
        }

        private static void SetPrivateField<T>(object target, string fieldName, T value)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic);
            if (field != null)
            {
                field.SetValue(target, value);
            }
        }
    }
}
