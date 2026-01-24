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
        private readonly ArtifactRegistry registry = new();
        private Dictionary<EventType, DreamOfOne.World.ArtifactDefinition> definitions = null;

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            BuildDefinitionLookup();
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

            var definition = ResolveDefinition(record.eventType);
            string artifactId = definition != null ? definition.DisplayName : record.eventType.ToString();
            string inspectText = BuildInspectText(definition, record);

            if (!registry.TryAddFromEvent(record, artifactId, inspectText))
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
                    EventType.TaskStarted => new Color(0.6f, 0.6f, 0.9f),
                    EventType.TaskCompleted => new Color(0.4f, 0.9f, 0.6f),
                    EventType.LabelChanged => new Color(0.9f, 0.7f, 0.4f),
                    EventType.QueueUpdated => new Color(0.7f, 0.7f, 0.7f),
                    EventType.SeatClaimed => new Color(0.5f, 0.8f, 0.5f),
                    EventType.NoiseObserved => new Color(0.9f, 0.4f, 0.6f),
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

        private void BuildDefinitionLookup()
        {
            if (definitions != null)
            {
                return;
            }

            definitions = new Dictionary<EventType, DreamOfOne.World.ArtifactDefinition>();
            var assets = Resources.LoadAll<DreamOfOne.World.ArtifactDefinition>("Artifacts");
            for (int i = 0; i < assets.Length; i++)
            {
                var definition = assets[i];
                if (definition == null)
                {
                    continue;
                }

                if (!definitions.ContainsKey(definition.SourceEvent))
                {
                    definitions.Add(definition.SourceEvent, definition);
                }
            }
        }

        private DreamOfOne.World.ArtifactDefinition ResolveDefinition(EventType type)
        {
            BuildDefinitionLookup();
            if (definitions == null)
            {
                return null;
            }

            definitions.TryGetValue(type, out var definition);
            return definition;
        }

        private static string BuildInspectText(DreamOfOne.World.ArtifactDefinition definition, EventRecord record)
        {
            if (record == null)
            {
                return string.Empty;
            }

            if (definition == null || string.IsNullOrEmpty(definition.InspectTextTemplate))
            {
                return string.IsNullOrEmpty(record.note) ? record.eventType.ToString() : record.note;
            }

            string text = definition.InspectTextTemplate;
            text = text.Replace("{actor}", record.actorId ?? string.Empty);
            text = text.Replace("{place}", record.placeId ?? string.Empty);
            text = text.Replace("{zone}", record.zoneId ?? string.Empty);
            text = text.Replace("{topic}", record.topic ?? string.Empty);
            text = text.Replace("{note}", record.note ?? string.Empty);
            return text;
        }

        public IReadOnlyList<ArtifactRecord> GetArtifacts()
        {
            return registry.Artifacts;
        }

        public void ResetArtifacts()
        {
            foreach (var entry in markers.Values)
            {
                if (entry.marker != null)
                {
                    Destroy(entry.marker);
                }
            }

            markers.Clear();
            registry.Clear();
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
