using DreamOfOne.Society;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public sealed class SocietyJsonEnvelopeTests
    {
        [Test]
        public void TryParseDecisionEnvelope_AcceptsBackendIntentWithoutSchemaVersion()
        {
            const string raw =
                "{\"intent\":{\"npcId\":\"NPC_A\",\"actionType\":\"Observe\",\"reasonCodes\":[\"runtime.ok\"],\"confidence\":0.8},\"meta\":{\"usedFallback\":false,\"threadId\":\"thread-1\",\"transport\":\"codex\",\"reasonCategory\":\"none\",\"warningTier\":\"reference\"}}";

            bool ok = SocietyJson.TryParseDecisionEnvelope(raw, "NPC_A", out var envelope, out string error);

            Assert.IsTrue(ok, $"Expected envelope parse success but got: {error}");
            Assert.IsNotNull(envelope);
            Assert.IsNotNull(envelope.intent);
            Assert.AreEqual(SocietyRuntimeContract.IntentSchemaVersion, envelope.intent.schemaVersion);
            Assert.AreEqual("codex", envelope.meta.transport);
            Assert.AreEqual("thread-1", envelope.meta.threadId);
            Assert.AreEqual("none", envelope.meta.reasonCategory);
            Assert.AreEqual("reference", envelope.meta.warningTier);
        }

        [Test]
        public void TryParseDecisionEnvelope_RejectsUnknownTransport()
        {
            const string raw =
                "{\"intent\":{\"schemaVersion\":\"society.intent.v1\",\"npcId\":\"NPC_A\",\"actionType\":\"Observe\",\"reasonCodes\":[\"runtime.ok\"],\"confidence\":0.4},\"meta\":{\"usedFallback\":false,\"transport\":\"custom-bridge\"}}";

            bool ok = SocietyJson.TryParseDecisionEnvelope(raw, "NPC_A", out var _, out string error);

            Assert.IsFalse(ok, "Unknown transport should be rejected.");
            StringAssert.Contains("unknown meta.transport", error);
        }

        [Test]
        public void TryParseDecisionEnvelope_RejectsFallbackWithoutReason()
        {
            const string raw =
                "{\"intent\":{\"schemaVersion\":\"society.intent.v1\",\"npcId\":\"NPC_A\",\"actionType\":\"Observe\",\"reasonCodes\":[\"fallback:codex_timeout\"],\"confidence\":0.1},\"meta\":{\"usedFallback\":true,\"transport\":\"fallback\"}}";

            bool ok = SocietyJson.TryParseDecisionEnvelope(raw, "NPC_A", out var _, out string error);

            Assert.IsFalse(ok, "Fallback envelope without reason should be rejected.");
            StringAssert.Contains("meta.reason is required", error);
        }

        [Test]
        public void TryParseDecisionEnvelope_RejectsUnknownWarningTier()
        {
            const string raw =
                "{\"intent\":{\"schemaVersion\":\"society.intent.v1\",\"npcId\":\"NPC_A\",\"actionType\":\"Observe\",\"reasonCodes\":[\"runtime.ok\"],\"confidence\":0.5},\"meta\":{\"usedFallback\":false,\"transport\":\"codex\",\"warningTier\":\"escalated\"}}";

            bool ok = SocietyJson.TryParseDecisionEnvelope(raw, "NPC_A", out var _, out string error);

            Assert.IsFalse(ok, "Unknown warningTier should be rejected.");
            StringAssert.Contains("unknown meta.warningTier", error);
        }
    }
}
