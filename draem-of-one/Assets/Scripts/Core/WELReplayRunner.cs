using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// JSONL로 저장된 WEL 이벤트를 재생한다.
    /// </summary>
    public sealed class WELReplayRunner : MonoBehaviour
    {
        [SerializeField]
        private float playbackSpeed = 1f;

        [SerializeField]
        private bool clearExisting = false;

        private Coroutine replayRoutine = null;

        [System.Serializable]
        private struct LogLine
        {
            public string utc;
            public float stamp;
            public string id;
            public string eventType;
            public string category;
            public string actorId;
            public string actorRole;
            public string ruleId;
            public string zoneId;
            public string placeId;
            public string topic;
            public string note;
            public int severity;
            public float trust;
        }

        public void ReplayFromFile(string filePath, float speed = 1f, bool clear = false)
        {
            if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath))
            {
                Debug.LogWarning($"[WELReplay] File not found: {filePath}");
                return;
            }

            if (replayRoutine != null)
            {
                StopCoroutine(replayRoutine);
                replayRoutine = null;
            }

            playbackSpeed = Mathf.Max(0.1f, speed);
            clearExisting = clear;
            replayRoutine = StartCoroutine(ReplayCoroutine(filePath));
        }

        private IEnumerator ReplayCoroutine(string filePath)
        {
            var log = FindFirstObjectByType<WorldEventLog>();
            if (log == null)
            {
                Debug.LogWarning("[WELReplay] WorldEventLog not found.");
                replayRoutine = null;
                yield break;
            }

            if (clearExisting)
            {
                Debug.Log("[WELReplay] Clearing existing events is not supported in WEL yet.");
            }

            var lines = new List<LogLine>();
            foreach (var line in File.ReadLines(filePath))
            {
                if (string.IsNullOrWhiteSpace(line))
                {
                    continue;
                }

                try
                {
                    var entry = JsonUtility.FromJson<LogLine>(line);
                    lines.Add(entry);
                }
                catch
                {
                    Debug.LogWarning("[WELReplay] Failed to parse line.");
                }
            }

            if (lines.Count == 0)
            {
                replayRoutine = null;
                yield break;
            }

            lines.Sort((a, b) => a.stamp.CompareTo(b.stamp));
            float startStamp = lines[0].stamp;
            float startTime = Time.time;

            for (int i = 0; i < lines.Count; i++)
            {
                var entry = lines[i];
                float targetTime = startTime + ((entry.stamp - startStamp) / playbackSpeed);
                while (Time.time < targetTime)
                {
                    yield return null;
                }

                var record = new EventRecord
                {
                    id = entry.id,
                    stamp = entry.stamp,
                    actorId = entry.actorId,
                    actorRole = entry.actorRole,
                    ruleId = entry.ruleId,
                    zoneId = entry.zoneId,
                    placeId = entry.placeId,
                    topic = entry.topic,
                    note = entry.note,
                    severity = entry.severity,
                    trust = entry.trust
                };

                if (System.Enum.TryParse(entry.eventType, out EventType parsedType))
                {
                    record.eventType = parsedType;
                }

                log.RecordEvent(record);
            }

            Debug.Log("[WELReplay] Replay complete.");
            replayRoutine = null;
        }
    }
}
