using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 증거/절차 이벤트를 간단한 월드 마커로 시각화한다.
    /// </summary>
    public sealed class ArtifactSystem : MonoBehaviour
    {
        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private float markerHeight = 1.2f;

        [SerializeField]
        private float markerScale = 0.3f;

        private struct ArtifactInfo
        {
            public GameObject marker;
            public string topic;
            public string placeId;
            public EventType type;
        }

        private readonly Dictionary<string, ArtifactInfo> markers = new();

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
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

        private void HandleEvent(EventRecord record)
        {
            if (record == null)
            {
                return;
            }

            if (record.eventType is not (EventType.CctvCaptured or EventType.TicketIssued or EventType.EvidenceCaptured
                or EventType.ApprovalGranted or EventType.RcInserted))
            {
                return;
            }

            if (markers.ContainsKey(record.id))
            {
                return;
            }

            var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            marker.name = $"Artifact_{record.eventType}_{record.id}";
            marker.transform.position = (record.position == Vector3.zero ? transform.position : record.position) + Vector3.up * markerHeight;
            marker.transform.localScale = Vector3.one * markerScale;

            var renderer = marker.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.material.color = record.eventType switch
                {
                    EventType.TicketIssued => new Color(0.9f, 0.3f, 0.2f),
                    EventType.CctvCaptured => new Color(0.2f, 0.6f, 0.9f),
                    EventType.EvidenceCaptured => new Color(0.3f, 0.8f, 0.4f),
                    EventType.ApprovalGranted => new Color(0.8f, 0.8f, 0.2f),
                    EventType.RcInserted => new Color(0.9f, 0.6f, 0.2f),
                    _ => new Color(0.7f, 0.7f, 0.7f)
                };
            }

            marker.transform.SetParent(transform, true);
            markers[record.id] = new ArtifactInfo
            {
                marker = marker,
                topic = record.topic,
                placeId = record.placeId,
                type = record.eventType
            };
        }

        public void HighlightCase(CaseBundle bundle)
        {
            if (bundle == null)
            {
                return;
            }

            foreach (var entry in markers.Values)
            {
                if (entry.marker == null)
                {
                    continue;
                }

                bool match = (!string.IsNullOrEmpty(bundle.placeId) && entry.placeId == bundle.placeId)
                    || (!string.IsNullOrEmpty(bundle.topic) && entry.topic == bundle.topic);

                entry.marker.transform.localScale = match
                    ? Vector3.one * (markerScale * 1.6f)
                    : Vector3.one * markerScale;
            }
        }
    }
}
