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
    }
}
