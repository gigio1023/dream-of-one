using System.Collections.Generic;
using DreamOfOne.NPC;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 위반 로그를 바탕으로 소문 이벤트를 생성한다.
    /// </summary>
    public sealed class GossipSystem : MonoBehaviour
    {
        private struct PendingGossip
        {
            public float fireTime;
            public EventRecord record;
        }

        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private SemanticShaper semanticShaper = null;

        [SerializeField]
        private float gossipDelaySeconds = 2f;

        [SerializeField]
        private float gossipCooldownSeconds = 8f;

        [SerializeField]
        [Tooltip("가십 전파 최소 근접 거리")]
        private float talkDistance = 4f;

        private readonly Queue<PendingGossip> pending = new();
        private float lastGossipTime = -999f;

        private readonly Dictionary<string, float> rumorTopics = new();

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (semanticShaper == null)
            {
                semanticShaper = FindFirstObjectByType<SemanticShaper>();
            }
        }

        private void OnEnable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded += HandleEvent;
            }
        }

        private void OnDisable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded -= HandleEvent;
            }
        }

        private void Update()
        {
            float now = Time.time;
            if (pending.Count == 0)
            {
                return;
            }

            if (now - lastGossipTime < gossipCooldownSeconds)
            {
                return;
            }

            if (pending.Peek().fireTime > now)
            {
                return;
            }

            var item = pending.Dequeue();
            EmitRumor(item.record, now);
        }

        private void HandleEvent(EventRecord record)
        {
            if (record.eventType == EventType.ViolationDetected)
            {
                pending.Enqueue(new PendingGossip
                {
                    fireTime = Time.time + gossipDelaySeconds,
                    record = record
                });
            }
            else if (record.eventType is EventType.EvidenceCaptured or EventType.CctvCaptured or EventType.TicketIssued)
            {
                TryConfirmRumor(record);
            }
            else if (record.eventType == EventType.VerdictGiven)
            {
                ApplyVerdict(record);
            }
        }

        private void EmitRumor(EventRecord source, float now)
        {
            var speaker = FindNearestSpeaker(source.position);
            if (speaker == null || eventLog == null)
            {
                return;
            }

            if (!HasNearbyListener(speaker.transform.position))
            {
                return;
            }

            string text = semanticShaper != null ? semanticShaper.ToText(source) : source.eventType.ToString();
            text = string.IsNullOrEmpty(text) ? "규칙 위반 소문" : text;

            eventLog.RecordEvent(new EventRecord
            {
                actorId = speaker.NpcId,
                actorRole = speaker.Role,
                eventType = EventType.RumorShared,
                category = EventCategory.Gossip,
                note = text,
                topic = source.topic,
                placeId = source.placeId,
                zoneId = source.zoneId,
                position = speaker.transform.position,
                severity = 1,
                trust = 0.45f,
                sourceId = source.actorId
            });

            lastGossipTime = now;
            string topicKey = BuildTopicKey(source.topic, source.placeId);
            rumorTopics[topicKey] = now;
        }

        private void TryConfirmRumor(EventRecord evidence)
        {
            if (eventLog == null)
            {
                return;
            }

            string key = BuildTopicKey(evidence.topic, evidence.placeId);
            if (!rumorTopics.TryGetValue(key, out float lastTime))
            {
                return;
            }

            if (Time.time - lastTime > 180f)
            {
                rumorTopics.Remove(key);
                return;
            }

            eventLog.RecordEvent(new EventRecord
            {
                actorId = evidence.actorId,
                actorRole = evidence.actorRole,
                eventType = EventType.RumorConfirmed,
                category = EventCategory.Gossip,
                note = evidence.note,
                topic = evidence.topic,
                placeId = evidence.placeId,
                zoneId = evidence.zoneId,
                position = evidence.position,
                severity = 2,
                trust = 0.9f,
                sourceId = evidence.actorId
            });

            rumorTopics.Remove(key);
        }

        private void ApplyVerdict(EventRecord verdict)
        {
            if (eventLog == null)
            {
                return;
            }

            string key = BuildTopicKey(verdict.topic, verdict.placeId);
            if (!rumorTopics.ContainsKey(key))
            {
                return;
            }

            bool confirmed = verdict.note.Contains("퇴출") || verdict.note.Contains("의심 강화");
            bool debunked = verdict.note.Contains("무혐의");

            if (!confirmed && !debunked)
            {
                return;
            }

            eventLog.RecordEvent(new EventRecord
            {
                actorId = verdict.actorId,
                actorRole = verdict.actorRole,
                eventType = confirmed ? EventType.RumorConfirmed : EventType.RumorDebunked,
                category = EventCategory.Gossip,
                note = verdict.note,
                topic = verdict.topic,
                placeId = verdict.placeId,
                zoneId = verdict.zoneId,
                position = verdict.position,
                severity = confirmed ? 2 : 1,
                trust = confirmed ? 0.95f : 0.1f,
                sourceId = verdict.actorId
            });

            rumorTopics.Remove(key);
        }

        private NpcContext FindNearestSpeaker(Vector3 position)
        {
            var contexts = FindObjectsByType<NpcContext>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            NpcContext closest = null;
            float closestDist = float.MaxValue;

            foreach (var context in contexts)
            {
                if (context == null)
                {
                    continue;
                }

                if (context.Role == "Police")
                {
                    continue;
                }

                float dist = Vector3.Distance(position, context.transform.position);
                if (dist < closestDist)
                {
                    closestDist = dist;
                    closest = context;
                }
            }

            return closest;
        }

        private bool HasNearbyListener(Vector3 position)
        {
            var contexts = FindObjectsByType<NpcContext>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            foreach (var context in contexts)
            {
                if (context == null)
                {
                    continue;
                }

                if (context.Role == "Police")
                {
                    continue;
                }

                float dist = Vector3.Distance(position, context.transform.position);
                if (dist <= talkDistance && dist > 0.1f)
                {
                    return true;
                }
            }

            return false;
        }

        private static string BuildTopicKey(string topic, string placeId)
        {
            return string.IsNullOrEmpty(topic) ? placeId : $"{placeId}:{topic}";
        }
    }
}
