using DreamOfOne.Society;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class SocietyRuntimeContractTests
    {
        [Test]
        public void TryParseDecision_ParsesV1Schema()
        {
            const string raw = "{\"schemaVersion\":\"society.decision.v1\",\"intent\":\"check\",\"utterance\":\"확인합니다\",\"actions\":[{\"actionType\":\"Talk\",\"text\":\"안녕하세요\"}],\"memoryWrite\":\"mem\"}";

            bool ok = SocietyJson.TryParseDecision(raw, out SocietyDecisionPayload decision, out string error);

            Assert.IsTrue(ok, error);
            Assert.IsNotNull(decision);
            Assert.AreEqual("society.decision.v1", decision.schemaVersion);
            Assert.AreEqual("안녕하세요", decision.actions[0].text);
        }

        [Test]
        public void TryParseDecision_NormalizesLegacyAliases()
        {
            const string raw = "{\"intent\":\"legacy\",\"speak\":\"legacy line\",\"actions\":[{\"type\":\"Speak\",\"text\":\"legacy text\"}]}";

            bool ok = SocietyJson.TryParseDecision(raw, out SocietyDecisionPayload decision, out string error);

            Assert.IsTrue(ok, error);
            Assert.IsNotNull(decision);
            Assert.AreEqual("legacy line", decision.utterance);
            Assert.AreEqual("Speak", decision.actions[0].actionType);
        }

        [Test]
        public void TryParseDecision_RejectsUnsupportedSchema()
        {
            const string raw = "{\"schemaVersion\":\"society.decision.v9\",\"intent\":\"x\"}";

            bool ok = SocietyJson.TryParseDecision(raw, out SocietyDecisionPayload _, out string error);

            Assert.IsFalse(ok);
            StringAssert.Contains("unsupported schemaVersion", error);
        }

        [Test]
        public void Validator_RejectsUnknownActionType()
        {
            var payload = new SocietyDecisionPayload
            {
                schemaVersion = SocietyRuntimeContract.DecisionSchemaVersion,
                actions = new[]
                {
                    new SocietyDecisionAction { actionType = "Teleport" }
                }
            };

            bool ok = SocietyDecisionValidator.TryValidate(payload, new[] { "Talk" }, out string reason);

            Assert.IsFalse(ok);
            StringAssert.Contains("unknown actionType", reason);
        }

        [Test]
        public void Validator_RejectsActionNotAllowedForActor()
        {
            var payload = new SocietyDecisionPayload
            {
                schemaVersion = SocietyRuntimeContract.DecisionSchemaVersion,
                actions = new[]
                {
                    new SocietyDecisionAction { actionType = "Report", ruleId = "R1" }
                }
            };

            bool ok = SocietyDecisionValidator.TryValidate(payload, new[] { "Talk", "Move" }, out string reason);

            Assert.IsFalse(ok);
            StringAssert.Contains("not allowed", reason);
        }

        [Test]
        public void Validator_AcceptsLegacyActionAlias()
        {
            var payload = new SocietyDecisionPayload
            {
                schemaVersion = SocietyRuntimeContract.DecisionSchemaVersion,
                actions = new[]
                {
                    new SocietyDecisionAction { type = "Speak", text = "hello" }
                }
            };

            bool ok = SocietyDecisionValidator.TryValidate(payload, new[] { "Talk", "Observe" }, out string reason);

            Assert.IsTrue(ok, reason);
            Assert.AreEqual("Talk", payload.actions[0].actionType);
        }
    }
}
