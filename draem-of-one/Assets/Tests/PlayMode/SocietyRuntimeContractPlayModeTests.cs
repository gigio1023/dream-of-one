using System;
using System.Collections;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using DreamOfOne.Core;
using DreamOfOne.LLM;
using DreamOfOne.NPC;
using DreamOfOne.Society;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.PlayModeTests
{
    public sealed class SocietyRuntimeContractPlayModeTests
    {
        private sealed class ContractFixture
        {
            public GameObject Root;
            public SocietyBrain Brain;
            public NpcPersona Persona;
            public WorldEventLog EventLog;
            public SocietyRuntimeClient RuntimeClient;
        }

        private sealed class SingleResponseServer : IDisposable
        {
            private readonly HttpListener listener;
            private readonly Thread worker;
            private readonly Func<string, string> responder;
            private readonly int statusCode;
            private volatile bool disposed;

            public string Url { get; }

            public SingleResponseServer(Func<string, string> responder, int statusCode = 200)
            {
                this.responder = responder;
                this.statusCode = statusCode;

                int port = AcquireFreePort();
                Url = $"http://127.0.0.1:{port}/";

                listener = new HttpListener();
                listener.Prefixes.Add(Url);
                listener.Start();

                worker = new Thread(ServeOnce)
                {
                    IsBackground = true
                };
                worker.Start();
            }

            private void ServeOnce()
            {
                try
                {
                    var context = listener.GetContext();
                    string requestBody = string.Empty;
                    using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                    {
                        requestBody = reader.ReadToEnd();
                    }

                    string responseBody = responder != null ? responder(requestBody) : string.Empty;
                    byte[] buffer = Encoding.UTF8.GetBytes(responseBody ?? string.Empty);
                    context.Response.StatusCode = statusCode;
                    context.Response.ContentType = "application/json";
                    context.Response.ContentEncoding = Encoding.UTF8;
                    context.Response.ContentLength64 = buffer.Length;
                    context.Response.OutputStream.Write(buffer, 0, buffer.Length);
                    context.Response.OutputStream.Flush();
                    context.Response.OutputStream.Close();
                }
                catch (Exception)
                {
                    if (!disposed)
                    {
                        throw;
                    }
                }
            }

            public void Dispose()
            {
                if (disposed)
                {
                    return;
                }

                disposed = true;
                try
                {
                    listener.Stop();
                }
                catch
                {
                    // Ignore shutdown race in tests.
                }

                listener.Close();
            }

            private static int AcquireFreePort()
            {
                var tcp = new TcpListener(System.Net.IPAddress.Loopback, 0);
                tcp.Start();
                int port = ((IPEndPoint)tcp.LocalEndpoint).Port;
                tcp.Stop();
                return port;
            }
        }

        [UnityTest]
        public IEnumerator ValidIntentExecutesNpcUtterance()
        {
            var fixture = CreateFixture("NPC_Contract_Valid");
            try
            {
                string rawIntent =
                    "{\"schemaVersion\":\"society.intent.v1\",\"npcId\":\"" + fixture.Persona.NpcId +
                    "\",\"actionType\":\"Talk\",\"utterance\":\"테스트 발화\",\"reasonCodes\":[\"spec.valid\"],\"confidence\":0.8}";

                bool applied = fixture.Brain.TryApplyIntentJson(rawIntent, out string blockedReason);

                Assert.IsTrue(applied, "Valid intent should execute");
                Assert.IsTrue(string.IsNullOrEmpty(blockedReason), $"blockedReason should be empty, got: {blockedReason}");

                yield return null;

                bool hasUtterance = fixture.EventLog.Events.Any(record =>
                    record != null &&
                    record.eventType == CoreEventType.NpcUtterance &&
                    record.actorId == fixture.Persona.NpcId);

                Assert.IsTrue(hasUtterance, "Valid Talk intent should emit NpcUtterance event");
            }
            finally
            {
                if (fixture.Root != null)
                {
                    UnityEngine.Object.Destroy(fixture.Root);
                }
            }
        }

        [UnityTest]
        public IEnumerator InvalidIntentTriggersDeterministicFallbackWithReason()
        {
            var fixture = CreateFixture("NPC_Contract_Invalid");
            try
            {
                string rawIntent =
                    "{\"schemaVersion\":\"society.intent.v1\",\"npcId\":\"" + fixture.Persona.NpcId +
                    "\",\"actionType\":\"Hack\",\"reasonCodes\":[\"spec.invalid\"],\"confidence\":0.5}";

                bool applied = fixture.Brain.TryApplyIntentJson(rawIntent, out string blockedReason);

                Assert.IsFalse(applied, "Invalid intent should be rejected");
                StringAssert.Contains("invalid_intent", blockedReason);

                yield return null;

                bool hasRejected = fixture.EventLog.Events.Any(record =>
                    record != null &&
                    record.eventType == CoreEventType.IntentRejected &&
                    record.actorId == fixture.Persona.NpcId &&
                    record.note.Contains("invalid_intent"));

                bool hasFallback = fixture.EventLog.Events.Any(record =>
                    record != null &&
                    record.eventType == CoreEventType.IntentFallbackApplied &&
                    record.actorId == fixture.Persona.NpcId);

                Assert.IsTrue(hasRejected, "Invalid intent should create IntentRejected event with reason");
                Assert.IsTrue(hasFallback, "Invalid intent should create IntentFallbackApplied event");
            }
            finally
            {
                if (fixture.Root != null)
                {
                    UnityEngine.Object.Destroy(fixture.Root);
                }
            }
        }

        [UnityTest]
        public IEnumerator BackendMetaEvent_EmitsTransportThreadAndCausalityFields()
        {
            var fixture = CreateFixture("NPC_Contract_Meta");
            try
            {
                var method = typeof(SocietyBrain).GetMethod(
                    "RecordBackendDecisionMeta",
                    BindingFlags.NonPublic | BindingFlags.Instance);
                Assert.IsNotNull(method, "RecordBackendDecisionMeta must exist.");

                var meta = new DecisionMetaPayload
                {
                    usedFallback = true,
                    reason = "codex_timeout",
                    reasonCategory = "timeout",
                    warningTier = "attention",
                    threadId = "thread-meta-1",
                    transport = "fallback"
                };
                var intent = new NpcIntentPayload
                {
                    schemaVersion = SocietyRuntimeContract.IntentSchemaVersion,
                    npcId = fixture.Persona.NpcId,
                    actionType = "Observe",
                    reasonCodes = new[] { "fallback:codex_timeout" },
                    confidence = 0f
                };

                method.Invoke(fixture.Brain, new object[] { meta, intent });
                yield return null;

                var log = fixture.EventLog.Events.LastOrDefault(record =>
                    record != null &&
                    record.eventType == CoreEventType.ExplanationGiven &&
                    record.actorId == fixture.Persona.NpcId);

                Assert.IsNotNull(log, "Expected backend explanation event.");
                StringAssert.Contains("transport=fallback", log.note);
                StringAssert.Contains("usedFallback=True", log.note);
                StringAssert.Contains("reason=codex_timeout", log.note);
                StringAssert.Contains("reasonCategory=timeout", log.note);
                StringAssert.Contains("warningTier=attention", log.note);
                StringAssert.Contains("threadId=thread-meta-1", log.note);
            }
            finally
            {
                if (fixture.Root != null)
                {
                    UnityEngine.Object.Destroy(fixture.Root);
                }
            }
        }

        [UnityTest]
        public IEnumerator BackendBridgeE2E_AppliesIntentAndEmitsMetaEvent()
        {
            var fixture = CreateFixture("NPC_Contract_Backend_Success");
            try
            {
                string expectedNpcId = fixture.Persona.NpcId;
                using var server = new SingleResponseServer(_ =>
                    "{\"intent\":{\"schemaVersion\":\"society.intent.v1\",\"npcId\":\"" + expectedNpcId +
                    "\",\"actionType\":\"Talk\",\"utterance\":\"테스트 발화\",\"reasonCodes\":[\"runtime.success\"],\"confidence\":0.9}," +
                    "\"meta\":{\"usedFallback\":false,\"reason\":\"\",\"reasonCategory\":\"none\",\"warningTier\":\"reference\",\"threadId\":\"thread-e2e-1\",\"transport\":\"codex\"}}");

                ConfigureRuntimeClientForTest(fixture.RuntimeClient, server.Url, timeoutSeconds: 5);

                fixture.Brain.DebugRunDecisionCycle();
                yield return WaitForFramesUntil(() =>
                {
                    bool hasMeta = fixture.EventLog.Events.Any(record =>
                        record != null &&
                        record.eventType == CoreEventType.ExplanationGiven &&
                        record.actorId == fixture.Persona.NpcId &&
                        record.note.Contains("transport=codex") &&
                        record.note.Contains("threadId=thread-e2e-1") &&
                        record.note.Contains("reasonCategory=none") &&
                        record.note.Contains("warningTier=reference"));

                    bool hasUtterance = fixture.EventLog.Events.Any(record =>
                        record != null &&
                        record.eventType == CoreEventType.NpcUtterance &&
                        record.actorId == fixture.Persona.NpcId &&
                        record.note.Contains("테스트 발화"));

                    return hasMeta && hasUtterance;
                }, 180, "Expected backend meta event and applied utterance.");
            }
            finally
            {
                if (fixture.Root != null)
                {
                    UnityEngine.Object.Destroy(fixture.Root);
                }
            }
        }

        [UnityTest]
        public IEnumerator BackendBridgeE2E_ParseErrorTriggersDeterministicFallback()
        {
            var fixture = CreateFixture("NPC_Contract_Backend_ParseError");
            try
            {
                using var server = new SingleResponseServer(_ => "not-a-json-response");
                ConfigureRuntimeClientForTest(fixture.RuntimeClient, server.Url, timeoutSeconds: 5);

                fixture.Brain.DebugRunDecisionCycle();
                yield return WaitForFramesUntil(() =>
                    fixture.EventLog.Events.Any(record =>
                        record != null &&
                        record.eventType == CoreEventType.IntentFallbackApplied &&
                        record.actorId == fixture.Persona.NpcId &&
                        record.note.Contains("runtime_parse_error")), 180,
                    "Expected deterministic fallback for runtime parse error.");
            }
            finally
            {
                if (fixture.Root != null)
                {
                    UnityEngine.Object.Destroy(fixture.Root);
                }
            }
        }

        [UnityTest]
        public IEnumerator BackendBridgeE2E_HttpErrorTriggersDeterministicFallback()
        {
            var fixture = CreateFixture("NPC_Contract_Backend_HttpError");
            try
            {
                string unreachableEndpoint = "http://127.0.0.1:9/";
                ConfigureRuntimeClientForTest(fixture.RuntimeClient, unreachableEndpoint, timeoutSeconds: 1);

                fixture.Brain.DebugRunDecisionCycle();
                yield return WaitForFramesUntil(() =>
                    fixture.EventLog.Events.Any(record =>
                        record != null &&
                        record.eventType == CoreEventType.IntentFallbackApplied &&
                        record.actorId == fixture.Persona.NpcId &&
                        record.note.Contains("runtime_http_error")), 180,
                    "Expected deterministic fallback for runtime HTTP error.");
            }
            finally
            {
                if (fixture.Root != null)
                {
                    UnityEngine.Object.Destroy(fixture.Root);
                }
            }
        }

        private static IEnumerator WaitForFramesUntil(Func<bool> condition, int maxFrames, string timeoutMessage)
        {
            for (int i = 0; i < maxFrames; i++)
            {
                if (condition())
                {
                    yield break;
                }

                yield return null;
            }

            Assert.Fail(timeoutMessage);
        }

        private static void ConfigureRuntimeClientForTest(SocietyRuntimeClient runtimeClient, string endpoint, int timeoutSeconds)
        {
            Assert.IsNotNull(runtimeClient, "SocietyRuntimeClient fixture is required.");
            SetPrivateField(runtimeClient, "backendEnabled", true);
            SetPrivateField(runtimeClient, "decisionEndpoint", endpoint);
            SetPrivateField(runtimeClient, "timeoutSeconds", timeoutSeconds);
            SetPrivateField(runtimeClient, "verbose", true);
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            Assert.IsNotNull(field, $"Expected field '{fieldName}' on {target.GetType().Name}");
            field.SetValue(target, value);
        }

        private static ContractFixture CreateFixture(string npcObjectName)
        {
            var root = new GameObject("SocietyRuntimeContractFixture");
            var eventLog = root.AddComponent<WorldEventLog>();
            var llmClient = root.AddComponent<LLMClient>();
            var reportManager = root.AddComponent<ReportManager>();
            var runtimeClient = root.AddComponent<SocietyRuntimeClient>();

            var npc = new GameObject(npcObjectName);
            npc.transform.SetParent(root.transform);

            var persona = npc.AddComponent<NpcPersona>();
            var brain = npc.AddComponent<SocietyBrain>();
            brain.Configure(pack: null, log: eventLog, llm: llmClient, reports: reportManager, shaper: null, runtime: runtimeClient);

            return new ContractFixture
            {
                Root = root,
                Brain = brain,
                Persona = persona,
                EventLog = eventLog,
                RuntimeClient = runtimeClient
            };
        }
    }
}
