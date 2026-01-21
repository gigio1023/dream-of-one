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
    }
}
