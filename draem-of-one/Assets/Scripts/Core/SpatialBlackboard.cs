using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 장소/오브젝트 단위 최근 로그 버퍼.
    /// </summary>
    public sealed class SpatialBlackboard : MonoBehaviour
    {
        [SerializeField]
        private string boardId = "";

        [SerializeField]
        private float ttlSeconds = 90f;

        [SerializeField]
        private float evidenceTtlSeconds = 300f;

        [SerializeField]
        private float procedureTtlSeconds = 240f;

        [SerializeField]
        private float gossipTtlSeconds = 150f;

        [SerializeField]
        private int maxEntries = 10;

        private readonly List<BlackboardEntry> entries = new();

        public string BoardId => string.IsNullOrEmpty(boardId) ? name : boardId;

        public Vector3 Position => transform.position;

        public void Configure(string id, float ttl, int maxCount)
        {
            boardId = id;
            ttlSeconds = ttl;
            maxEntries = Mathf.Max(1, maxCount);
        }

        public void AddEntry(BlackboardEntry entry)
        {
            entry.timestamp = Time.time;
            entries.Add(entry);
            Prune(Time.time);

            if (entries.Count > maxEntries)
            {
                entries.RemoveAt(0);
            }
        }

        public IReadOnlyList<BlackboardEntry> GetEntries(float now)
        {
            Prune(now);
            return entries;
        }

        private void Prune(float now)
        {
            for (int i = entries.Count - 1; i >= 0; i--)
            {
                float ttl = ttlSeconds;
                switch (entries[i].category)
                {
                    case EventCategory.Evidence:
                        ttl = evidenceTtlSeconds;
                        break;
                    case EventCategory.Procedure:
                        ttl = procedureTtlSeconds;
                        break;
                    case EventCategory.Gossip:
                        ttl = gossipTtlSeconds;
                        break;
                }

                if (now - entries[i].timestamp > ttl)
                {
                    entries.RemoveAt(i);
                }
            }
        }
    }
}
