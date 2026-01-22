using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// WEL 이벤트를 장소 단위 Blackboard로 배치한다.
    /// </summary>
    public sealed class BlackboardSystem : MonoBehaviour
    {
        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private SemanticShaper semanticShaper = null;

        [SerializeField]
        private float defaultTtlSeconds = 120f;

        [SerializeField]
        private int maxEntriesPerBoard = 20;

        private readonly List<SpatialBlackboard> boards = new();

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

            CacheBoards();
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

        private void CacheBoards()
        {
            boards.Clear();

            foreach (var board in FindObjectsByType<SpatialBlackboard>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (board != null && !boards.Contains(board))
                {
                    boards.Add(board);
                }
            }

            foreach (var zone in FindObjectsByType<Zone>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (zone == null)
                {
                    continue;
                }

                var board = zone.GetComponent<SpatialBlackboard>();
                if (board == null)
                {
                    board = zone.gameObject.AddComponent<SpatialBlackboard>();
                }

                board.Configure(zone.ZoneId, defaultTtlSeconds, maxEntriesPerBoard);

                if (!boards.Contains(board))
                {
                    boards.Add(board);
                }
            }
        }

        private void HandleEvent(EventRecord record)
        {
            if (record == null)
            {
                return;
            }

            var board = ResolveBoard(record);
            if (board == null)
            {
                return;
            }

            string text = semanticShaper != null ? semanticShaper.ToText(record) : record.eventType.ToString();
            var entry = new BlackboardEntry
            {
                eventId = record.id,
                text = text,
                actorId = record.actorId,
                topic = string.IsNullOrEmpty(record.topic) ? record.eventType.ToString() : record.topic,
                category = record.category,
                severity = record.severity,
                position = record.position,
                trust = record.trust,
                sourceId = record.sourceId
            };

            board.AddEntry(entry);
        }

        private SpatialBlackboard ResolveBoard(EventRecord record)
        {
            if (boards.Count == 0)
            {
                CacheBoards();
            }

            if (boards.Count == 0)
            {
                return null;
            }

            if (!string.IsNullOrEmpty(record.placeId))
            {
                for (int i = 0; i < boards.Count; i++)
                {
                    if (string.Equals(boards[i].BoardId, record.placeId, System.StringComparison.OrdinalIgnoreCase))
                    {
                        return boards[i];
                    }
                }
            }

            if (!string.IsNullOrEmpty(record.zoneId))
            {
                for (int i = 0; i < boards.Count; i++)
                {
                    if (string.Equals(boards[i].BoardId, record.zoneId, System.StringComparison.OrdinalIgnoreCase))
                    {
                        return boards[i];
                    }
                }
            }

            if (record.position != Vector3.zero)
            {
                SpatialBlackboard closest = null;
                float closestDist = float.MaxValue;
                for (int i = 0; i < boards.Count; i++)
                {
                    var board = boards[i];
                    if (board == null)
                    {
                        continue;
                    }

                    float dist = Vector3.Distance(record.position, board.Position);
                    if (dist < closestDist)
                    {
                        closestDist = dist;
                        closest = board;
                    }
                }

                return closest;
            }

            return boards[0];
        }
    }
}
