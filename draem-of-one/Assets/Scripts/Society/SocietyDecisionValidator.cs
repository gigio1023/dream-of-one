using System;

namespace DreamOfOne.Society
{
    public static class SocietyDecisionValidator
    {
        public static bool TryValidate(SocietyDecisionPayload payload, string[] allowedActionTypes, out string reason)
        {
            reason = string.Empty;
            if (payload == null)
            {
                reason = "decision payload is null";
                return false;
            }

            if (payload.actions == null)
            {
                payload.actions = Array.Empty<SocietyDecisionAction>();
            }

            if (payload.actions.Length > 2)
            {
                reason = "decision includes more than 2 actions";
                return false;
            }

            for (int i = 0; i < payload.actions.Length; i++)
            {
                SocietyDecisionAction action = payload.actions[i];
                if (action == null)
                {
                    reason = $"action[{i}] is null";
                    return false;
                }

                string actionType = SocietyRuntimeContract.NormalizeActionType(GetRawActionType(action));
                if (!SocietyRuntimeContract.IsKnownActionType(actionType))
                {
                    reason = $"action[{i}] has unknown actionType '{GetRawActionType(action)}'";
                    return false;
                }

                action.actionType = actionType;
                if (!IsAllowedForActor(actionType, allowedActionTypes))
                {
                    reason = $"action[{i}] '{actionType}' is not allowed for this NPC";
                    return false;
                }

                if ((actionType == "Talk" || actionType == "Ask")
                    && string.IsNullOrWhiteSpace(action.text)
                    && string.IsNullOrWhiteSpace(payload.utterance))
                {
                    reason = $"action[{i}] '{actionType}' requires text or utterance";
                    return false;
                }

                if (!float.IsNaN(action.confidence) && action.confidence >= 0f)
                {
                    if (action.confidence > 1f)
                    {
                        action.confidence = 1f;
                    }
                }
            }

            return true;
        }

        private static string GetRawActionType(SocietyDecisionAction action)
        {
            if (!string.IsNullOrWhiteSpace(action.actionType))
            {
                return action.actionType;
            }

            return action.type ?? string.Empty;
        }

        private static bool IsAllowedForActor(string actionType, string[] allowedActionTypes)
        {
            if (actionType == "Idle" || actionType == "Observe")
            {
                return true;
            }

            if (allowedActionTypes == null || allowedActionTypes.Length == 0)
            {
                return false;
            }

            for (int i = 0; i < allowedActionTypes.Length; i++)
            {
                string allowed = SocietyRuntimeContract.NormalizeActionType(allowedActionTypes[i]);
                if (string.Equals(allowed, actionType, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
