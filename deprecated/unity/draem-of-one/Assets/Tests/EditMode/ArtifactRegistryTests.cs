using DreamOfOne.Core;
using CoreEventType = DreamOfOne.Core.EventType;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class ArtifactRegistryTests
    {
        [Test]
        public void TryAddFromEvent_AddsArtifactForEvidenceEvent()
        {
            var registry = new ArtifactRegistry();
            var record = new EventRecord
            {
                id = "evt-1",
                eventType = CoreEventType.TicketIssued,
                topic = "R_QUEUE",
                placeId = "Store",
                position = new Vector3(1f, 0f, 2f),
                note = "ticket"
            };

            bool added = registry.TryAddFromEvent(record, "Violation Ticket", "ticket");

            Assert.IsTrue(added);
            Assert.AreEqual(1, registry.Artifacts.Count);
            Assert.AreEqual("evt-1", registry.Artifacts[0].Id);
            Assert.AreEqual(CoreEventType.TicketIssued, registry.Artifacts[0].SourceEvent);
        }

        [Test]
        public void TryAddFromEvent_IgnoresNonArtifactEvent()
        {
            var registry = new ArtifactRegistry();
            var record = new EventRecord
            {
                id = "evt-2",
                eventType = CoreEventType.EnteredZone,
                topic = "Zone",
                placeId = "Park"
            };

            bool added = registry.TryAddFromEvent(record, "Zone", "zone");

            Assert.IsFalse(added);
            Assert.AreEqual(0, registry.Artifacts.Count);
        }
    }
}
