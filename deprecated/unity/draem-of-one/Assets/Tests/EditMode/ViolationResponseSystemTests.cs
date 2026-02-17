using DreamOfOne.Core;
using CoreEventType = DreamOfOne.Core.EventType;
using DreamOfOne.NPC;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class ViolationResponseSystemTests
    {
        [Test]
        public void HandleViolation_UpdatesSuspicionOnWitnesses()
        {
            var logObject = new GameObject("WEL");
            var log = logObject.AddComponent<WorldEventLog>();

            var npcObject = new GameObject("Witness");
            var suspicion = npcObject.AddComponent<SuspicionComponent>();
            TestHelpers.SetPrivateField<ReportManager>(suspicion, "reportManager", null);
            TestHelpers.SetPrivateField<GlobalSuspicionSystem>(suspicion, "globalSuspicion", null);
            TestHelpers.SetPrivateField<WorldEventLog>(suspicion, "eventLog", null);

            var systemObject = new GameObject("ResponseSystem");
            var responseSystem = systemObject.AddComponent<ViolationResponseSystem>();
            TestHelpers.SetPrivateField(responseSystem, "eventLog", log);
            TestHelpers.SetPrivateField(responseSystem, "defaultSuspicionDelta", 10f);

            responseSystem.ConfigureRuleDelta("R10", 15f);
            responseSystem.RegisterWitness(suspicion);

            var record = new EventRecord
            {
                actorId = "Player",
                actorRole = "Player",
                eventType = CoreEventType.ViolationDetected,
                ruleId = "R10",
                zoneId = "Photo"
            };

            responseSystem.HandleViolation(record);

            Assert.Greater(suspicion.CurrentSuspicion, 0f, "Suspicion should increase on violation.");

            Object.DestroyImmediate(systemObject);
            Object.DestroyImmediate(npcObject);
            Object.DestroyImmediate(logObject);
        }

        [Test]
        public void HandleViolation_ScopesToNearestWitnesses()
        {
            var logObject = new GameObject("WEL");
            var log = logObject.AddComponent<WorldEventLog>();

            SuspicionComponent CreateWitness(string name, Vector3 position)
            {
                var npcObject = new GameObject(name);
                npcObject.transform.position = position;
                var component = npcObject.AddComponent<SuspicionComponent>();
                TestHelpers.SetPrivateField<ReportManager>(component, "reportManager", null);
                TestHelpers.SetPrivateField<GlobalSuspicionSystem>(component, "globalSuspicion", null);
                TestHelpers.SetPrivateField<WorldEventLog>(component, "eventLog", null);
                return component;
            }

            var near = CreateWitness("Witness-Near", new Vector3(0.2f, 0f, 0f));
            var mid = CreateWitness("Witness-Mid", new Vector3(1.2f, 0f, 0f));
            var far = CreateWitness("Witness-Far", new Vector3(6f, 0f, 0f));

            var systemObject = new GameObject("ResponseSystem");
            var responseSystem = systemObject.AddComponent<ViolationResponseSystem>();
            TestHelpers.SetPrivateField(responseSystem, "eventLog", log);
            TestHelpers.SetPrivateField(responseSystem, "defaultSuspicionDelta", 10f);
            TestHelpers.SetPrivateField(responseSystem, "scopeWitnessesByDistance", true);
            TestHelpers.SetPrivateField(responseSystem, "witnessRadius", 2f);
            TestHelpers.SetPrivateField(responseSystem, "maxWitnessesPerViolation", 1);
            TestHelpers.SetPrivateField(responseSystem, "useDistanceFalloff", false);

            responseSystem.RegisterWitness(near);
            responseSystem.RegisterWitness(mid);
            responseSystem.RegisterWitness(far);

            responseSystem.HandleViolation(new EventRecord
            {
                actorId = "Player",
                actorRole = "Player",
                eventType = CoreEventType.ViolationDetected,
                ruleId = "R10",
                position = new Vector3(0.1f, 0f, 0f)
            });

            Assert.Greater(near.CurrentSuspicion, 0f, "Nearest witness should react.");
            Assert.AreEqual(0f, mid.CurrentSuspicion, 0.001f, "Second witness should be capped by max witness count.");
            Assert.AreEqual(0f, far.CurrentSuspicion, 0.001f, "Far witness should not react.");

            Object.DestroyImmediate(systemObject);
            Object.DestroyImmediate(near.gameObject);
            Object.DestroyImmediate(mid.gameObject);
            Object.DestroyImmediate(far.gameObject);
            Object.DestroyImmediate(logObject);
        }
    }
}
