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
            EventType.NoiseObserved,
            EventType.ReportFiled,
            EventType.RumorConfirmed,
            EventType.ExplanationGiven,
            EventType.RebuttalGiven
        };

        private readonly List<ArtifactRecord> artifacts = new();
        private readonly HashSet<string> artifactIds = new();

        public IReadOnlyList<ArtifactRecord> Artifacts => artifacts;

        public bool TryAddFromEvent(EventRecord record, string artifactId, string inspectText)
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

            string summary = string.IsNullOrEmpty(record.note) ? record.eventType.ToString() : record.note;
            var artifact = new ArtifactRecord(
                record.id,
                record.eventType,
                artifactId ?? record.eventType.ToString(),
                record.topic,
                record.placeId,
                record.position,
                summary,
                inspectText ?? summary);

            artifacts.Add(artifact);
            artifactIds.Add(record.id);
            return true;
        }

        public void Clear()
        {
            artifacts.Clear();
            artifactIds.Clear();
        }
    }
}
