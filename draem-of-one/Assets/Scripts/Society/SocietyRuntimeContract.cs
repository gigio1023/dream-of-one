using System;
using System.Collections.Generic;
using DreamOfOne.Core;
using DreamOfOne.NPC;
using UnityEngine;

namespace DreamOfOne.Society
{
    public static class SocietyRuntimeContract
    {
        public const string ObservationSchemaVersion = "society.observe.v1";
        public const string DecisionSchemaVersion = "society.decision.v1";

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

        public static IReadOnlyList<string> ActionTypes => KnownActionTypes;

        public static string NormalizeActionType(string rawActionType)
        {
            if (string.IsNullOrWhiteSpace(rawActionType))
            {
                return string.Empty;
            }

            string value = rawActionType.Trim();
            if (value.Equals("Speak", StringComparison.OrdinalIgnoreCase))
            {
                return "Talk";
            }

            if (value.Equals("MoveToAnchor", StringComparison.OrdinalIgnoreCase))
            {
                return "Move";
            }

            if (value.Equals("FileReport", StringComparison.OrdinalIgnoreCase))
            {
                return "Report";
            }

            for (int i = 0; i < KnownActionTypes.Length; i++)
            {
                if (value.Equals(KnownActionTypes[i], StringComparison.OrdinalIgnoreCase))
                {
                    return KnownActionTypes[i];
                }
            }

            return value;
        }

        public static bool IsKnownActionType(string actionType)
        {
            if (string.IsNullOrEmpty(actionType))
            {
                return false;
            }

            for (int i = 0; i < KnownActionTypes.Length; i++)
            {
                if (string.Equals(KnownActionTypes[i], actionType, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        public static string ToObservationJson(SocietyObservationPayload payload)
        {
            if (payload == null)
            {
                return "{}";
            }

            return JsonUtility.ToJson(payload);
        }

        public static SocietyObservationPayload BuildObservationPayload(
            NpcPersona persona,
            Transform actorTransform,
            IReadOnlyList<EventRecord> events,
            string[] memoryEntries,
            string[] allowedActions)
        {
            var payload = new SocietyObservationPayload
            {
                schemaVersion = ObservationSchemaVersion,
                self = new SocietyObservationSelf
                {
                    npcId = persona != null ? persona.NpcId : string.Empty,
                    role = persona != null ? persona.Role.ToString() : string.Empty,
                    roleId = persona != null ? persona.RoleId.ToString() : string.Empty,
                    position = SocietyVector3.FromVector3(actorTransform != null ? actorTransform.position : Vector3.zero)
                },
                allowedActionTypes = allowedActions ?? Array.Empty<string>(),
                memory = memoryEntries ?? Array.Empty<string>()
            };

            if (events != null && events.Count > 0)
            {
                var mapped = new List<SocietyObservationEvent>(events.Count);
                for (int i = 0; i < events.Count; i++)
                {
                    var record = events[i];
                    if (record == null)
                    {
                        continue;
                    }

                    mapped.Add(new SocietyObservationEvent
                    {
                        id = record.id ?? string.Empty,
                        eventType = record.eventType.ToString(),
                        actorId = record.actorId ?? string.Empty,
                        actorRole = record.actorRole ?? string.Empty,
                        targetId = record.targetId ?? string.Empty,
                        placeId = record.placeId ?? string.Empty,
                        zoneId = record.zoneId ?? string.Empty,
                        ruleId = record.ruleId ?? string.Empty,
                        note = record.note ?? string.Empty,
                        severity = record.severity
                    });
                }

                payload.recentEvents = mapped.ToArray();
            }

            return payload;
        }
    }

    [Serializable]
    public sealed class SocietyObservationPayload
    {
        public string schemaVersion = SocietyRuntimeContract.ObservationSchemaVersion;
        public SocietyObservationSelf self = new();
        public string[] allowedActionTypes = Array.Empty<string>();
        public SocietyObservationEvent[] recentEvents = Array.Empty<SocietyObservationEvent>();
        public string[] memory = Array.Empty<string>();
    }

    [Serializable]
    public sealed class SocietyObservationSelf
    {
        public string npcId = string.Empty;
        public string role = string.Empty;
        public string roleId = string.Empty;
        public SocietyVector3 position = new();
    }

    [Serializable]
    public sealed class SocietyObservationEvent
    {
        public string id = string.Empty;
        public string eventType = string.Empty;
        public string actorId = string.Empty;
        public string actorRole = string.Empty;
        public string targetId = string.Empty;
        public string placeId = string.Empty;
        public string zoneId = string.Empty;
        public string ruleId = string.Empty;
        public string note = string.Empty;
        public int severity = 0;
    }

    [Serializable]
    public sealed class SocietyDecisionPayload
    {
        public string schemaVersion = string.Empty;
        public string intent = string.Empty;
        public string utterance = string.Empty;
        public string speak = string.Empty; // legacy alias
        public SocietyDecisionAction[] actions = Array.Empty<SocietyDecisionAction>();
        public string memoryWrite = string.Empty;
    }

    [Serializable]
    public sealed class SocietyDecisionAction
    {
        public string actionType = string.Empty;
        public string type = string.Empty; // legacy alias
        public string targetId = string.Empty;
        public string locationId = string.Empty;
        public string placeId = string.Empty;
        public string zoneId = string.Empty;
        public string ruleId = string.Empty;
        public string text = string.Empty;
        public string anchorName = string.Empty;
        public float confidence = -1f;
    }

    [Serializable]
    public sealed class SocietyVector3
    {
        public float x = 0f;
        public float y = 0f;
        public float z = 0f;

        public static SocietyVector3 FromVector3(Vector3 value)
        {
            return new SocietyVector3
            {
                x = value.x,
                y = value.y,
                z = value.z
            };
        }
    }
}
