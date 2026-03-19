using DreamOfOne.Core;
using CoreEventType = DreamOfOne.Core.EventType;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class WorldEventLogTests
    {
        [Test]
        public void RecordEvent_AssignsIdCategoryAndNotifies()
        {
            var go = new GameObject("WEL");
            var log = go.AddComponent<WorldEventLog>();

            bool notified = false;
            EventRecord captured = null;
            log.OnEventRecorded += record =>
            {
                notified = true;
                captured = record;
            };

            var record = new EventRecord
            {
                actorId = "Player",
                actorRole = "Player",
                eventType = CoreEventType.ViolationDetected,
                ruleId = "R4",
                note = "test"
            };

            log.RecordEvent(record);

            Assert.IsTrue(notified, "OnEventRecorded should fire.");
            Assert.IsNotNull(captured, "Captured record should not be null.");
            Assert.IsFalse(string.IsNullOrEmpty(captured.id), "Record ID should be assigned.");
            Assert.AreEqual(EventCategory.Rule, captured.category, "Category should be inferred from event type.");
            Object.DestroyImmediate(go);
        }
    }
}
