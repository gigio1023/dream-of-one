using System.Collections.Generic;
using DreamOfOne.Core;
using UnityEngine;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// NPC가 주입받은 로그를 저장하고 반응을 발생시키는 컨텍스트.
    /// </summary>
    public sealed class NpcContext : MonoBehaviour
    {
        [SerializeField]
        private NpcPersona persona = null;

        [SerializeField]
        private SuspicionComponent suspicion = null;

        [SerializeField]
        private float memoryTtlSeconds = 480f;

        [SerializeField]
        private int memoryCapacity = 5;

        [SerializeField]
        private float topicCooldownSeconds = 30f;

        [SerializeField]
        private float actorCooldownSeconds = 20f;

        [SerializeField]
        private float injectedSuspicionDelta = 6f;

        private readonly List<BlackboardEntry> memory = new();
        private readonly Dictionary<string, float> topicLastTime = new();
        private readonly Dictionary<string, float> actorLastTime = new();
        private readonly HashSet<string> seenEventIds = new();

        public string Role => persona != null ? persona.Role : "Citizen";
        public RoleId RoleId => persona != null ? persona.RoleId : RoleId.Citizen;
        public string NpcId => persona != null ? persona.NpcId : name;

        private void Awake()
        {
            if (persona == null)
            {
                persona = GetComponent<NpcPersona>();
            }

            if (suspicion == null)
            {
                suspicion = GetComponent<SuspicionComponent>();
            }

            memoryCapacity = Mathf.Clamp(memoryCapacity, 1, 5);
        }

        public void ReceiveEntry(BlackboardEntry entry, float now)
        {
            if (!string.IsNullOrEmpty(entry.eventId) && seenEventIds.Contains(entry.eventId))
            {
                return;
            }

            if (!string.IsNullOrEmpty(entry.topic) && topicLastTime.TryGetValue(entry.topic, out float last)
                && now - last < GetTopicCooldown(entry))
            {
                return;
            }

            if (!string.IsNullOrEmpty(entry.actorId) && actorLastTime.TryGetValue(entry.actorId, out float lastActor)
                && now - lastActor < actorCooldownSeconds)
            {
                return;
            }

            if (!string.IsNullOrEmpty(entry.eventId))
            {
                seenEventIds.Add(entry.eventId);
            }

            if (!string.IsNullOrEmpty(entry.topic))
            {
                topicLastTime[entry.topic] = now;
            }

            if (!string.IsNullOrEmpty(entry.actorId))
            {
                actorLastTime[entry.actorId] = now;
            }

            memory.Add(entry);
            Prune(now);

            if (suspicion != null && entry.category is EventCategory.Rule or EventCategory.Gossip or EventCategory.Evidence)
            {
                float trustFactor = Mathf.Clamp01(0.5f + entry.trust);
                float delta = (injectedSuspicionDelta + entry.severity * 2f) * trustFactor;
                suspicion.AddSuspicion(delta, entry.topic, entry.eventId);
            }
        }

        private void Prune(float now)
        {
            for (int i = memory.Count - 1; i >= 0; i--)
            {
                if (now - memory[i].timestamp > memoryTtlSeconds)
                {
                    memory.RemoveAt(i);
                }
            }

            if (memory.Count > memoryCapacity)
            {
                memory.RemoveRange(0, memory.Count - memoryCapacity);
            }
        }

        private float GetTopicCooldown(BlackboardEntry entry)
        {
            float baseCooldown = topicCooldownSeconds;
            if (entry.category == EventCategory.Evidence || entry.category == EventCategory.Procedure)
            {
                baseCooldown *= 0.5f;
            }
            else if (entry.severity >= 2)
            {
                baseCooldown *= 0.7f;
            }

            return baseCooldown;
        }
    }
}
