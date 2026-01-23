using System.Collections.Generic;

namespace DreamOfOne.Core
{
    public sealed class ArtifactRegistry
    {
        private static readonly HashSet<EventType> ArtifactTypes = new()
        {
            EventType.CctvCaptured,
            EventType.TicketIssued,
            EventType.EvidenceCaptured,
            EventType.ApprovalGranted,
            EventType.RcInserted,
            EventType.TaskStarted,
            EventType.TaskCompleted,
            EventType.LabelChanged,
            EventType.QueueUpdated,
            EventType.SeatClaimed,
            EventType.NoiseObserved
        };

        private readonly List<ArtifactRecord> artifacts = new();
        private readonly HashSet<string> artifactIds = new();

        public IReadOnlyList<ArtifactRecord> Artifacts => artifacts;

        public bool TryAddFromEvent(EventRecord record)
        {
            if (record == null || string.IsNullOrEmpty(record.id))
            {
                return false;
            }

            if (!ArtifactTypes.Contains(record.eventType))
            {
                return false;
            }

            if (artifactIds.Contains(record.id))
            {
                return false;
            }

            var artifact = new ArtifactRecord(
                record.id,
                record.eventType,
                record.topic,
                record.placeId,
                record.position,
                record.note);

            artifacts.Add(artifact);
            artifactIds.Add(record.id);
            return true;
        }
    }
}
