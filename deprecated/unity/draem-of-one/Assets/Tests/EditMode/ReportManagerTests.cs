using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class ReportManagerTests
    {
        [Test]
        public void TryConsumeReport_ReturnsEnvelopeWhenThresholdMet()
        {
            var go = new GameObject("ReportManager");
            var manager = go.AddComponent<ReportManager>();

            TestHelpers.SetPrivateField(manager, "reportsRequired", 2);
            TestHelpers.SetPrivateField(manager, "interrogationCooldownSeconds", 0f);

            manager.FileReport("NPC-A", "R4", 55f, "evt-1");
            manager.FileReport("NPC-B", "R4", 60f, "evt-2");

            Assert.IsTrue(manager.TryConsumeReport(out var envelope), "Report should be consumable after threshold.");
            Assert.IsNotNull(envelope, "Envelope should be returned.");
            Assert.AreEqual(2, envelope.reporterIds.Count, "Envelope should include reporters.");
            Assert.IsTrue(envelope.reporterIds.Contains("NPC-A"));
            Assert.IsTrue(envelope.reporterIds.Contains("NPC-B"));
            Object.DestroyImmediate(go);
        }

        [Test]
        public void FileReport_ThrottlesDuplicateActorAndEventStorm()
        {
            var go = new GameObject("ReportManager");
            var manager = go.AddComponent<ReportManager>();

            TestHelpers.SetPrivateField(manager, "reportsRequired", 2);
            TestHelpers.SetPrivateField(manager, "interrogationCooldownSeconds", 0f);
            TestHelpers.SetPrivateField(manager, "maxReportsPerEvent", 2);
            TestHelpers.SetPrivateField(manager, "reporterEventCooldownSeconds", 30f);

            manager.FileReport("NPC-A", "R4", 55f, "evt-1");
            manager.FileReport("NPC-A", "R4", 56f, "evt-1"); // same reporter + event (cooldown block)
            manager.FileReport("NPC-B", "R4", 60f, "evt-1");
            manager.FileReport("NPC-C", "R4", 62f, "evt-1"); // event max-count block

            Assert.IsTrue(manager.TryConsumeReport(out var envelope), "Threshold should be met by two accepted reports.");
            Assert.IsNotNull(envelope);
            Assert.AreEqual(2, envelope.reporterIds.Count, "Only non-throttled reporters should remain.");
            Assert.IsTrue(envelope.reporterIds.Contains("NPC-A"));
            Assert.IsTrue(envelope.reporterIds.Contains("NPC-B"));
            Assert.IsFalse(envelope.reporterIds.Contains("NPC-C"));

            Object.DestroyImmediate(go);
        }
    }
}
