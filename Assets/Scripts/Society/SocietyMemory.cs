using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Society
{
    /// <summary>
    /// Lightweight per-agent memory buffer for LLM prompting.
    /// </summary>
    public sealed class SocietyMemory : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("Max entries stored in working memory.")]
        private int capacity = 12;

        private readonly List<string> entries = new();

        public IReadOnlyList<string> Entries => entries;

        public void Add(string entry)
        {
            if (string.IsNullOrWhiteSpace(entry))
            {
                return;
            }

            entries.Add(entry.Trim());
            Prune();
        }

        public string BuildSummary(int maxLines)
        {
            if (entries.Count == 0)
            {
                return "None.";
            }

            int take = Mathf.Clamp(maxLines, 1, entries.Count);
            int start = Mathf.Max(0, entries.Count - take);
            return string.Join("\n", entries.GetRange(start, take));
        }

        private void Prune()
        {
            capacity = Mathf.Clamp(capacity, 4, 64);
            if (entries.Count <= capacity)
            {
                return;
            }

            entries.RemoveRange(0, entries.Count - capacity);
        }
    }
}

