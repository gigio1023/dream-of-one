using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Schedules events in a deterministic way while capping per-lane/global bursts within a time window.
    /// </summary>
    public sealed class DeterministicEventPacer
    {
        private readonly float windowSeconds;
        private readonly int maxPerLanePerWindow;
        private readonly int maxGlobalPerWindow;
        private readonly float jitterSeconds;
        private readonly int seed;

        private readonly Dictionary<string, Queue<float>> laneSchedules = new();
        private readonly Dictionary<string, int> laneSequence = new();
        private readonly Dictionary<string, float> laneLastScheduled = new();
        private readonly Queue<float> globalSchedule = new();
        private float globalLastScheduled = float.NegativeInfinity;

        public DeterministicEventPacer(float windowSeconds, int maxPerLanePerWindow, int maxGlobalPerWindow, float jitterSeconds, int seed)
        {
            this.windowSeconds = Mathf.Max(0.1f, windowSeconds);
            this.maxPerLanePerWindow = Mathf.Max(1, maxPerLanePerWindow);
            this.maxGlobalPerWindow = Mathf.Max(1, maxGlobalPerWindow);
            this.jitterSeconds = Mathf.Max(0f, jitterSeconds);
            this.seed = seed;
        }

        public float Schedule(string laneId, float now)
        {
            laneId = string.IsNullOrEmpty(laneId) ? "default" : laneId;
            if (!laneSchedules.TryGetValue(laneId, out Queue<float> laneQueue))
            {
                laneQueue = new Queue<float>();
                laneSchedules[laneId] = laneQueue;
                laneSequence[laneId] = 0;
                laneLastScheduled[laneId] = float.NegativeInfinity;
            }

            int sequence = laneSequence[laneId] + 1;
            laneSequence[laneId] = sequence;

            float candidate = now + ComputeJitter(laneId, sequence);
            float laneLast = laneLastScheduled[laneId];
            if (!float.IsNegativeInfinity(laneLast))
            {
                candidate = Mathf.Max(candidate, laneLast);
            }

            if (!float.IsNegativeInfinity(globalLastScheduled))
            {
                candidate = Mathf.Max(candidate, globalLastScheduled);
            }

            candidate = EnforceWindowCap(laneQueue, maxPerLanePerWindow, candidate);
            candidate = EnforceWindowCap(globalSchedule, maxGlobalPerWindow, candidate);

            laneQueue.Enqueue(candidate);
            globalSchedule.Enqueue(candidate);
            laneLastScheduled[laneId] = candidate;
            globalLastScheduled = candidate;
            return candidate;
        }

        public void Reset()
        {
            laneSchedules.Clear();
            laneSequence.Clear();
            laneLastScheduled.Clear();
            globalSchedule.Clear();
            globalLastScheduled = float.NegativeInfinity;
        }

        private float EnforceWindowCap(Queue<float> queue, int cap, float candidate)
        {
            while (true)
            {
                float cutoff = candidate - windowSeconds;
                Prune(queue, cutoff);
                if (queue.Count < cap)
                {
                    return candidate;
                }

                candidate = Mathf.Max(candidate, queue.Peek() + windowSeconds);
            }
        }

        private float ComputeJitter(string laneId, int sequence)
        {
            if (jitterSeconds <= 0f)
            {
                return 0f;
            }

            uint hash = (uint)seed;
            hash = Mix(hash, (uint)StableHash(laneId));
            hash = Mix(hash, (uint)sequence);
            float normalized = (hash & 0x00FFFFFFu) / 16777216f;
            return normalized * jitterSeconds;
        }

        private static uint Mix(uint hash, uint value)
        {
            unchecked
            {
                hash ^= value + 0x9e3779b9u + (hash << 6) + (hash >> 2);
                return hash;
            }
        }

        private static int StableHash(string text)
        {
            unchecked
            {
                uint hash = 2166136261u;
                for (int i = 0; i < text.Length; i++)
                {
                    hash ^= text[i];
                    hash *= 16777619u;
                }

                return (int)hash;
            }
        }

        private static void Prune(Queue<float> queue, float cutoff)
        {
            while (queue.Count > 0 && queue.Peek() <= cutoff)
            {
                queue.Dequeue();
            }
        }
    }
}
