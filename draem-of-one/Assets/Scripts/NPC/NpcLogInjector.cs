using System.Collections.Generic;
using DreamOfOne.Core;
using UnityEngine;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// 거리/시야 조건에 따라 NPC에게 주변 로그를 주입한다.
    /// </summary>
    public sealed class NpcLogInjector : MonoBehaviour
    {
        [SerializeField]
        private float tickInterval = 0.6f;

        [SerializeField]
        private float nearDistance = 1.2f;

        [SerializeField]
        private float fovDistance = 8f;

        [SerializeField]
        private float fovAngle = 90f;

        [SerializeField]
        private float noiseDistance = 6f;

        [SerializeField]
        private int maxNearEntries = 3;

        [SerializeField]
        private int maxFovEntries = 5;

        [SerializeField]
        private int maxNoiseEntries = 1;

        [SerializeField]
        private bool includePolice = false;

        private float lastTickTime = -999f;
        private readonly List<NpcContext> contexts = new();
        private readonly List<SpatialBlackboard> boards = new();

        private static readonly Queue<string> debugInjectedLines = new();
        private const int DebugLineCapacity = 12;

        public static IReadOnlyList<string> GetRecentInjectedLines()
        {
            return debugInjectedLines.ToArray();
        }

        private void Awake()
        {
            RefreshCaches();
            maxNearEntries = Mathf.Max(maxNearEntries, 3);
            maxFovEntries = Mathf.Max(maxFovEntries, 5);
            maxNoiseEntries = Mathf.Max(maxNoiseEntries, 1);
        }

        private void Update()
        {
            float now = Time.time;
            if (now - lastTickTime < tickInterval)
            {
                return;
            }

            lastTickTime = now;
            RefreshCaches();

            foreach (var context in contexts)
            {
                if (context == null)
                {
                    continue;
                }

                if (!includePolice && context.Role == "Police")
                {
                    continue;
                }

                InjectForContext(context, now);
            }
        }

        private void RefreshCaches()
        {
            contexts.Clear();
            contexts.AddRange(FindObjectsByType<NpcContext>(FindObjectsInactive.Include, FindObjectsSortMode.None));

            boards.Clear();
            boards.AddRange(FindObjectsByType<SpatialBlackboard>(FindObjectsInactive.Include, FindObjectsSortMode.None));
        }

        private void InjectForContext(NpcContext context, float now)
        {
            var pos = context.transform.position;
            var forward = context.transform.forward;

            var nearEntries = new List<BlackboardEntry>();
            var fovEntries = new List<BlackboardEntry>();
            var noiseEntries = new List<BlackboardEntry>();

            foreach (var board in boards)
            {
                if (board == null)
                {
                    continue;
                }

                float dist = Vector3.Distance(pos, board.Position);
                if (dist <= nearDistance)
                {
                    CollectEntries(board, nearEntries, maxNearEntries, now);
                }
                else if (dist <= fovDistance)
                {
                    Vector3 dir = (board.Position - pos).normalized;
                    if (Vector3.Angle(forward, dir) <= fovAngle * 0.5f)
                    {
                        CollectEntries(board, fovEntries, maxFovEntries, now);
                    }
                }

                if (dist <= noiseDistance)
                {
                    CollectEntries(board, noiseEntries, maxNoiseEntries, now, severityFilter: 2);
                }
            }

            ApplyEntries(context, nearEntries, now);
            ApplyEntries(context, fovEntries, now);
            ApplyEntries(context, noiseEntries, now);
        }

        private static void CollectEntries(SpatialBlackboard board, List<BlackboardEntry> output, int maxCount, float now, int severityFilter = -1)
        {
            var entries = board.GetEntries(now);
            var candidates = new List<BlackboardEntry>();
            for (int i = entries.Count - 1; i >= 0; i--)
            {
                var entry = entries[i];
                if (severityFilter >= 0 && entry.severity < severityFilter)
                {
                    continue;
                }

                candidates.Add(entry);
            }

            candidates.Sort((a, b) =>
            {
                int pa = GetPriority(a.category);
                int pb = GetPriority(b.category);
                if (pa != pb)
                {
                    return pb.CompareTo(pa);
                }

                return b.timestamp.CompareTo(a.timestamp);
            });

            for (int i = 0; i < candidates.Count && output.Count < maxCount; i++)
            {
                output.Add(candidates[i]);
            }
        }

        private static void ApplyEntries(NpcContext context, List<BlackboardEntry> entries, float now)
        {
            for (int i = 0; i < entries.Count; i++)
            {
                context.ReceiveEntry(entries[i], now);
                RememberDebugLine(context, entries[i]);
            }
        }

        private static void RememberDebugLine(NpcContext context, BlackboardEntry entry)
        {
            if (context == null || string.IsNullOrEmpty(entry.text))
            {
                return;
            }

            string line = $"{context.NpcId}: {entry.text}";
            if (line.Length > 120)
            {
                line = line.Substring(0, 120);
            }

            debugInjectedLines.Enqueue(line);
            while (debugInjectedLines.Count > DebugLineCapacity)
            {
                debugInjectedLines.Dequeue();
            }
        }

        private static int GetPriority(EventCategory category)
        {
            return category switch
            {
                EventCategory.Evidence => 4,
                EventCategory.Procedure => 3,
                EventCategory.Rule => 2,
                EventCategory.Gossip => 1,
                _ => 0
            };
        }
    }
}
