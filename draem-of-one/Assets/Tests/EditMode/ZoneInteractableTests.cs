using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class ZoneInteractableTests
    {
        [Test]
        public void TryInteract_RecordsViolationEvent()
        {
            var logObject = new GameObject("WEL");
            var log = logObject.AddComponent<WorldEventLog>();

            var zoneObject = new GameObject("Zone");
            var zone = zoneObject.AddComponent<Zone>();
            TestHelpers.SetPrivateField(zone, "zoneId", "Queue");
            TestHelpers.SetPrivateField(zone, "zoneType", ZoneType.Queue);

            var interactable = zoneObject.AddComponent<ZoneInteractable>();
            TestHelpers.SetPrivateField(interactable, "eventLog", log);
            TestHelpers.SetPrivateField(interactable, "zone", zone);
            TestHelpers.SetPrivateField(interactable, "ruleId", "R4");
            TestHelpers.SetPrivateField(interactable, "playerInside", true);

            interactable.TryInteract("Player", "Player");

            Assert.AreEqual(1, log.Events.Count, "Violation should be recorded.");
            var record = log.Events[0];
            Assert.AreEqual(EventType.ViolationDetected, record.eventType);
            Assert.AreEqual("R4", record.ruleId);
            Assert.AreEqual("Queue", record.zoneId);

            Object.DestroyImmediate(zoneObject);
            Object.DestroyImmediate(logObject);
        }
    }
}
