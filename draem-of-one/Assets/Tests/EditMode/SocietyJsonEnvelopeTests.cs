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
                "{\"intent\":{\"npcId\":\"NPC_A\",\"actionType\":\"Observe\",\"reasonCodes\":[\"runtime.ok\"],\"confidence\":0.8},\"meta\":{\"usedFallback\":false,\"threadId\":\"thread-1\",\"transport\":\"codex\"}}";

            bool ok = SocietyJson.TryParseDecisionEnvelope(raw, "NPC_A", out var envelope, out string error);

            Assert.IsTrue(ok, $"Expected envelope parse success but got: {error}");
            Assert.IsNotNull(envelope);
            Assert.IsNotNull(envelope.intent);
            Assert.AreEqual(SocietyRuntimeContract.IntentSchemaVersion, envelope.intent.schemaVersion);
            Assert.AreEqual("codex", envelope.meta.transport);
            Assert.AreEqual("thread-1", envelope.meta.threadId);
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
    }
}
