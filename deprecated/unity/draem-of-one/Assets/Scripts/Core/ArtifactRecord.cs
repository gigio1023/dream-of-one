using UnityEngine;

namespace DreamOfOne.Core
{
    public readonly struct ArtifactRecord
    {
        public string Id { get; }
        public EventType SourceEvent { get; }
        public string ArtifactId { get; }
        public string Topic { get; }
        public string PlaceId { get; }
        public Vector3 Position { get; }
        public string Summary { get; }
        public string InspectText { get; }

        public ArtifactRecord(
            string id,
            EventType sourceEvent,
            string artifactId,
            string topic,
            string placeId,
            Vector3 position,
            string summary,
            string inspectText)
        {
            Id = id;
            SourceEvent = sourceEvent;
            ArtifactId = artifactId;
            Topic = topic;
            PlaceId = placeId;
            Position = position;
            Summary = summary;
            InspectText = inspectText;
        }
    }
}
