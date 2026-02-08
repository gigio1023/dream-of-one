using System;

namespace DreamOfOne.Society
{
    public static class SocietyJson
    {
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

        public static bool TryParseDecision(string raw, out SocietyDecisionPayload decision, out string error)
        {
            decision = null;
            error = string.Empty;

            if (!TryExtractJsonObject(raw, out string json, out error))
            {
                return false;
            }

            try
            {
                decision = UnityEngine.JsonUtility.FromJson<SocietyDecisionPayload>(json);
                if (decision == null)
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

            NormalizeDecision(decision);
            if (!IsSupportedSchema(decision.schemaVersion))
            {
                error = $"unsupported schemaVersion: {decision.schemaVersion}";
                decision = null;
                return false;
            }

            return true;
        }

        /// <summary>
        /// Compatibility parser for legacy runtime contract diagnostics.
        /// Maps society decision payload into a single-action intent view.
        /// </summary>
        public static bool TryParseIntent(string raw, string expectedNpcId, out NpcIntentPayload intent, out string error)
        {
            intent = null;
            error = string.Empty;

            if (!TryParseDecision(raw, out SocietyDecisionPayload decision, out error))
            {
                return false;
            }

            SocietyDecisionAction primaryAction = null;
            if (decision.actions != null && decision.actions.Length > 0)
            {
                primaryAction = decision.actions[0];
            }

            string actionType = primaryAction != null
                ? SocietyRuntimeContract.NormalizeActionType(primaryAction.actionType)
                : "Observe";

            intent = new NpcIntentPayload
            {
                schemaVersion = SocietyRuntimeContract.IntentSchemaVersion,
                npcId = string.IsNullOrWhiteSpace(expectedNpcId) ? "UnknownNpc" : expectedNpcId.Trim(),
                actionType = string.IsNullOrWhiteSpace(actionType) ? "Observe" : actionType,
                targetId = primaryAction?.targetId ?? string.Empty,
                locationId = primaryAction?.locationId ?? string.Empty,
                placeId = primaryAction?.placeId ?? string.Empty,
                zoneId = primaryAction?.zoneId ?? string.Empty,
                ruleId = primaryAction?.ruleId ?? string.Empty,
                utterance = decision.utterance ?? string.Empty,
                reasonCodes = new[] { "compat_mapped" },
                confidence = primaryAction != null && primaryAction.confidence >= 0f ? primaryAction.confidence : 0f,
                meta = decision.meta ?? new SocietyDecisionMeta
                {
                    requestId = "missing-request-id",
                    transport = "unknown"
                }
            };

            return true;
        }

        public static bool TryParsePlan(string raw, out SocietyActionPlan plan, out string error)
        {
            plan = null;
            error = string.Empty;

            if (!TryParseDecision(raw, out var decision, out error))
            {
                return false;
            }

            var mappedActions = new SocietyAction[decision.actions.Length];
            for (int i = 0; i < decision.actions.Length; i++)
            {
                var source = decision.actions[i];
                mappedActions[i] = new SocietyAction
                {
                    type = source.actionType,
                    targetId = source.targetId,
                    placeId = source.placeId,
                    zoneId = source.zoneId,
                    ruleId = source.ruleId,
                    text = source.text,
                    anchorName = string.IsNullOrEmpty(source.anchorName) ? source.locationId : source.anchorName
                };
            }

            plan = new SocietyActionPlan
            {
                intent = decision.intent,
                speak = decision.utterance,
                actions = mappedActions,
                memoryWrite = decision.memoryWrite
            };

            return true;
        }

        private static void NormalizeDecision(SocietyDecisionPayload decision)
        {
            if (decision == null)
            {
                return;
            }

            if (decision.meta == null)
            {
                decision.meta = new SocietyDecisionMeta();
            }

            decision.meta.requestId = NormalizeMetaField(decision.meta.requestId, "missing-request-id");
            decision.meta.transport = NormalizeMetaField(decision.meta.transport, "unknown");

            if (string.IsNullOrWhiteSpace(decision.schemaVersion))
            {
                decision.schemaVersion = SocietyRuntimeContract.DecisionSchemaVersion;
            }

            if (string.IsNullOrWhiteSpace(decision.utterance))
            {
                decision.utterance = decision.speak ?? string.Empty;
            }

            if (decision.actions == null)
            {
                decision.actions = Array.Empty<SocietyDecisionAction>();
                return;
            }

            for (int i = 0; i < decision.actions.Length; i++)
            {
                var action = decision.actions[i];
                if (action == null)
                {
                    continue;
                }

                if (string.IsNullOrWhiteSpace(action.actionType))
                {
                    action.actionType = action.type ?? string.Empty;
                }

                if (string.IsNullOrWhiteSpace(action.locationId) && !string.IsNullOrWhiteSpace(action.anchorName))
                {
                    action.locationId = action.anchorName;
                }
            }
        }

        private static string NormalizeMetaField(string value, string fallback)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return fallback;
            }

            return value.Trim();
        }

        private static bool IsSupportedSchema(string schemaVersion)
        {
            if (string.IsNullOrWhiteSpace(schemaVersion))
            {
                return true;
            }

            return schemaVersion.Equals(SocietyRuntimeContract.DecisionSchemaVersion, StringComparison.OrdinalIgnoreCase);
        }
    }
}
