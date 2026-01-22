using System.Text;
using DreamOfOne.Core;
using TMPro;
using UnityEngine;

namespace DreamOfOne.UI
{
    /// <summary>
    /// 근처 Blackboard 상태를 UI로 출력한다.
    /// </summary>
    public sealed class BlackboardDebugUI : MonoBehaviour
    {
        [SerializeField]
        private TMP_Text outputText = null;

        [SerializeField]
        private Transform target = null;

        [SerializeField]
        private float refreshInterval = 0.5f;

        [SerializeField]
        private int maxLines = 6;

        private float lastUpdate = -999f;

        private void Awake()
        {
            if (outputText == null)
            {
                outputText = GetComponentInChildren<TMP_Text>(true);
            }

            if (target == null)
            {
                var player = GameObject.FindGameObjectWithTag("Player");
                if (player != null)
                {
                    target = player.transform;
                }
            }
        }

        private void Update()
        {
            if (outputText == null || target == null)
            {
                return;
            }

            float now = Time.time;
            if (now - lastUpdate < refreshInterval)
            {
                return;
            }

            lastUpdate = now;
            var board = FindNearestBoard(target.position);
            if (board == null)
            {
                outputText.SetText(string.Empty);
                return;
            }

            var entries = board.GetEntries(now);
            var builder = new StringBuilder();
            builder.Append($"Blackboard [{board.BoardId}]\n");
            int count = Mathf.Min(maxLines, entries.Count);
            for (int i = 0; i < count; i++)
            {
                var entry = entries[entries.Count - 1 - i];
                builder.Append($"- {entry.text}\n");
            }

            outputText.SetText(builder.ToString().TrimEnd());
        }

        private SpatialBlackboard FindNearestBoard(Vector3 position)
        {
            SpatialBlackboard closest = null;
            float closestDist = float.MaxValue;

            foreach (var board in FindObjectsByType<SpatialBlackboard>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (board == null)
                {
                    continue;
                }

                float dist = Vector3.Distance(position, board.Position);
                if (dist < closestDist)
                {
                    closestDist = dist;
                    closest = board;
                }
            }

            return closest;
        }
    }
}
