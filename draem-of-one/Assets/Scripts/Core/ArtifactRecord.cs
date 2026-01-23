using UnityEngine;

namespace DreamOfOne.Core
{
    public readonly struct ArtifactRecord
    {
        public string Id { get; }
        public EventType SourceEvent { get; }
        public string Topic { get; }
        public string PlaceId { get; }
        public Vector3 Position { get; }
        public string Summary { get; }

        public ArtifactRecord(string id, EventType sourceEvent, string topic, string placeId, Vector3 position, string summary)
        {
            Id = id;
            SourceEvent = sourceEvent;
            Topic = topic;
            PlaceId = placeId;
            Position = position;
            Summary = summary;
        }
    }
}
