using System;

namespace DreamOfOne.Society
{
    public static class SocietyRuntimeContract
    {
        public const string PerceptionSchemaVersion = "society.perception.v1";
        public const string IntentSchemaVersion = "society.intent.v1";
    }

    [Serializable]
    public sealed class OrganizationContextPayload
    {
        public string role = string.Empty;
        public string roleId = string.Empty;
        public string organizationId = string.Empty;
        public string[] allowedActionTypes = Array.Empty<string>();
    }

    [Serializable]
    public sealed class PlayerSignalsPayload
    {
        public string phase = string.Empty;
        public float elapsedSeconds = 0f;
        public float globalSuspicion = 0f;
        public int exposure = 0;
    }

    [Serializable]
    public sealed class PerceptionPacket
    {
        public string schemaVersion = SocietyRuntimeContract.PerceptionSchemaVersion;
        public string sessionId = string.Empty;
        public string npcId = string.Empty;
        public string landmarkId = string.Empty;
        public string[] nearbyActors = Array.Empty<string>();
        public string[] recentEvents = Array.Empty<string>();
        public OrganizationContextPayload organizationContext = new OrganizationContextPayload();
        public PlayerSignalsPayload playerSignals = new PlayerSignalsPayload();
        public string[] allowedActionTypes = Array.Empty<string>();
        public string cognitionPath = string.Empty;
        public string threadId = string.Empty;
    }

    [Serializable]
    public sealed class NpcIntentPayload
    {
        public string schemaVersion = SocietyRuntimeContract.IntentSchemaVersion;
        public string npcId = string.Empty;
        public string actionType = string.Empty;
        public string targetId = string.Empty;
        public string locationId = string.Empty;
        public string utterance = string.Empty;
        public string[] reasonCodes = Array.Empty<string>();
        public float confidence = 0f;
    }

    [Serializable]
    public sealed class DecisionMetaPayload
    {
        public bool usedFallback = false;
        public string reason = string.Empty;
        public string reasonDetail = string.Empty;
        public string reasonCategory = string.Empty;
        public string warningTier = string.Empty;
        public string threadId = string.Empty;
        public string transport = string.Empty;
    }

    [Serializable]
    public sealed class DecisionEnvelopePayload
    {
        public NpcIntentPayload intent = new NpcIntentPayload();
        public DecisionMetaPayload meta = new DecisionMetaPayload();
    }

    [Serializable]
    public sealed class ActionOutcome
    {
        public bool success = false;
        public string blockedReason = string.Empty;
        public string executedActionType = string.Empty;
        public string[] reasonCodes = Array.Empty<string>();
    }

    // Legacy action plan payload retained for compatibility while runtime spec v1 rolls out.
    [Serializable]
    public sealed class SocietyActionPlan
    {
        public string intent = string.Empty;
        public string speak = string.Empty;
        public SocietyAction[] actions = Array.Empty<SocietyAction>();
        public string memoryWrite = string.Empty;
    }

    [Serializable]
    public sealed class SocietyAction
    {
        public string type = string.Empty;
        public string targetId = string.Empty;
        public string placeId = string.Empty;
        public string zoneId = string.Empty;
        public string ruleId = string.Empty;
        public string text = string.Empty;
        public string anchorName = string.Empty;
    }
}
