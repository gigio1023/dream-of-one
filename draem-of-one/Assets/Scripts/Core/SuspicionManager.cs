using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class SuspicionManager : MonoBehaviour
    {
        [SerializeField]
        [Range(0f, 1f)]
        private float globalAwarenessG = 0f;

        [SerializeField]
        private List<NpcPerception> trackedNpcs = new List<NpcPerception>();

        public float GlobalAwarenessG => globalAwarenessG;

        public void RegisterNpc(NpcPerception npc)
        {
            if (npc != null && !trackedNpcs.Contains(npc))
            {
                trackedNpcs.Add(npc);
            }
        }

        public void UnregisterNpc(NpcPerception npc)
        {
            if (npc != null)
            {
                trackedNpcs.Remove(npc);
            }
        }

        public void ApplyViolation(DreamRule rule, IEnumerable<NpcPerception> witnesses, Vector3 violationPosition)
        {
            if (rule == null)
            {
                return;
            }

            float totalWitnessImpact = 0f;
            int count = 0;
            foreach (NpcPerception npc in witnesses)
            {
                if (npc == null)
                {
                    continue;
                }

                float factor = npc.GetWitnessFactor(violationPosition);
                float delta = rule.suspicionDelta * factor;
                npc.suspicion = Mathf.Clamp(npc.suspicion + delta, 0f, 100f);
                totalWitnessImpact += delta;
                count++;
            }

            // Simplified world awareness update: normalize by NPC count and by 100
            if (count > 0)
            {
                float normalized = Mathf.Clamp01((totalWitnessImpact / count) / 100f);
                // Light smoothing
                globalAwarenessG = Mathf.Clamp01(globalAwarenessG * 0.9f + normalized * 0.1f);
            }
        }
    }
}


