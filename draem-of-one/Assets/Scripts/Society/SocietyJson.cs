using System;
using System.Linq;

namespace DreamOfOne.Society
{
    public static class SocietyJson
    {
        private static readonly string[] KnownActionTypes =
        {
            "Move",
            "Talk",
            "Ask",
            "Observe",
            "Work",
            "Report",
            "Escort",
            "Idle"
        };

        /// <summary>
        /// Extract the first top-level JSON object from a possibly noisy LLM response.
        /// </summary>
        public static bool TryExtractJsonObject(string raw, out string json, out string error)
        {
            json = string.Empty;
            error = string.Empty;

            if (string.IsNullOrEmpty(raw))
            {
                error = "empty response";
                return false;
            }

            int start = raw.IndexOf('{');
            int end = raw.LastIndexOf('}');
            if (start < 0 || end < 0 || end <= start)
            {
                error = "no json object braces found";
                return false;
            }

            json = raw.Substring(start, end - start + 1).Trim();
            if (string.IsNullOrEmpty(json))
            {
                error = "json substring empty";
                return false;
            }

            return true;
        }

        public static bool TryParsePlan(string raw, out SocietyActionPlan plan, out string error)
        {
            plan = null;
            error = string.Empty;

            if (!TryExtractJsonObject(raw, out string json, out error))
            {
                return false;
            }

            try
            {
                plan = UnityEngine.JsonUtility.FromJson<SocietyActionPlan>(json);
                if (plan == null)
                {
                    error = "JsonUtility returned null";
                    return false;
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }

            return true;
        }

        public static bool TryParseIntent(string raw, string expectedNpcId, out NpcIntentPayload intent, out string error)
        {
            intent = null;
            error = string.Empty;

            if (!TryExtractJsonObject(raw, out string json, out error))
            {
                return false;
            }

            try
            {
                intent = UnityEngine.JsonUtility.FromJson<NpcIntentPayload>(json);
                if (intent == null)
                {
                    error = "JsonUtility returned null";
                    return false;
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }

            return TryValidateIntent(intent, expectedNpcId, out error);
        }

        public static bool TryParseDecisionEnvelope(string raw, string expectedNpcId, out DecisionEnvelopePayload envelope, out string error)
        {
            envelope = null;
            error = string.Empty;

            if (!TryExtractJsonObject(raw, out string json, out error))
            {
                return false;
            }

            try
            {
                envelope = UnityEngine.JsonUtility.FromJson<DecisionEnvelopePayload>(json);
                if (envelope == null)
                {
                    error = "JsonUtility returned null";
                    return false;
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }

            if (envelope.intent == null)
            {
                error = "intent is required";
                return false;
            }

            if (envelope.meta == null)
            {
                error = "meta is required";
                return false;
            }

            if (!TryValidateIntent(envelope.intent, expectedNpcId, out error))
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(envelope.meta.transport))
            {
                error = "meta.transport is required";
                return false;
            }

            if (envelope.meta.transport != "codex"
                && envelope.meta.transport != "codex-reply"
                && envelope.meta.transport != "fallback")
            {
                error = $"unknown meta.transport: {envelope.meta.transport}";
                return false;
            }

            return true;
        }

        private static bool TryValidateIntent(NpcIntentPayload intent, string expectedNpcId, out string error)
        {
            error = string.Empty;

            if (intent == null)
            {
                error = "intent is required";
                return false;
            }

            if (string.IsNullOrWhiteSpace(intent.schemaVersion))
            {
                // Backend contract omits schemaVersion on intent; normalize to runtime contract value.
                intent.schemaVersion = SocietyRuntimeContract.IntentSchemaVersion;
            }

            if (!string.Equals(intent.schemaVersion, SocietyRuntimeContract.IntentSchemaVersion, StringComparison.Ordinal))
            {
                error = $"unsupported schemaVersion: {intent.schemaVersion}";
                return false;
            }

            if (string.IsNullOrWhiteSpace(intent.npcId))
            {
                error = "npcId is required";
                return false;
            }

            if (!string.IsNullOrEmpty(expectedNpcId) &&
                !string.Equals(intent.npcId, expectedNpcId, StringComparison.Ordinal))
            {
                error = $"npcId mismatch: expected={expectedNpcId}, got={intent.npcId}";
                return false;
            }

            if (string.IsNullOrWhiteSpace(intent.actionType))
            {
                error = "actionType is required";
                return false;
            }

            if (!KnownActionTypes.Contains(intent.actionType, StringComparer.Ordinal))
            {
                error = $"unknown actionType: {intent.actionType}";
                return false;
            }

            if (intent.reasonCodes == null || intent.reasonCodes.Length == 0)
            {
                error = "reasonCodes is required";
                return false;
            }

            if (intent.confidence < 0f || intent.confidence > 1f)
            {
                error = "confidence must be between 0 and 1";
                return false;
            }

            if ((intent.actionType == "Talk" || intent.actionType == "Ask") &&
                string.IsNullOrWhiteSpace(intent.utterance))
            {
                error = $"{intent.actionType} requires utterance";
                return false;
            }

            return true;
        }
    }
}
