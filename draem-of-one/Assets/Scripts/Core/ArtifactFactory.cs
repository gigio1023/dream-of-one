using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Deterministic helpers for creating artifact-backed WEL events.
    /// </summary>
    public static class ArtifactFactory
    {
        public static string RecordWitnessStatement(
            WorldEventLog log,
            string witnessId,
            string witnessRole,
            string lawId,
            string detectorId,
            string placeId,
            string note,
            Vector3 position)
        {
            return RecordEvent(
                log,
                EventType.StatementGiven,
                witnessId,
                witnessRole,
                "PLAYER",
                lawId,
                detectorId,
                placeId,
                note,
                position,
                severity: 2);
        }

        public static string RecordComplaintMemo(
            WorldEventLog log,
            string reporterId,
            string reporterRole,
            string ruleId,
            string placeId,
            string note,
            Vector3 position)
        {
            return RecordEvent(
                log,
                EventType.ReportFiled,
                reporterId,
                reporterRole,
                "PLAYER",
                ruleId,
                sourceId: string.Empty,
                placeId,
                note,
                position,
                severity: 2);
        }

        public static string RecordDefenseMemo(
            WorldEventLog log,
            string actorId,
            string actorRole,
            string relatedRuleId,
            string placeId,
            string note,
            Vector3 position)
        {
            return RecordEvent(
                log,
                EventType.ExplanationGiven,
                actorId,
                actorRole,
                "PLAYER",
                relatedRuleId,
                sourceId: string.Empty,
                placeId,
                note,
                position,
                severity: 1);
        }

        public static string RecordNoticeSnapshot(
            WorldEventLog log,
            string actorId,
            string actorRole,
            string surfaceId,
            string placeId,
            string note,
            Vector3 position)
        {
            return RecordEvent(
                log,
                EventType.EvidenceCaptured,
                actorId,
                actorRole,
                "PLAYER",
                ruleId: surfaceId,
                sourceId: surfaceId,
                placeId,
                note,
                position,
                severity: 1);
        }

        public static string RecordTicketReceipt(
            WorldEventLog log,
            string actorId,
            string actorRole,
            string ruleId,
            string placeId,
            string note,
            Vector3 position)
        {
            return RecordEvent(
                log,
                EventType.TicketIssued,
                actorId,
                actorRole,
                "PLAYER",
                ruleId,
                sourceId: string.Empty,
                placeId,
                note,
                position,
                severity: 2);
        }

        public static string RecordApprovalNote(
            WorldEventLog log,
            string actorId,
            string actorRole,
            string ruleId,
            string placeId,
            string note,
            Vector3 position)
        {
            return RecordEvent(
                log,
                EventType.ApprovalGranted,
                actorId,
                actorRole,
                "PLAYER",
                ruleId,
                sourceId: string.Empty,
                placeId,
                note,
                position,
                severity: 1);
        }

        private static string RecordEvent(
            WorldEventLog log,
            EventType type,
            string actorId,
            string actorRole,
            string targetId,
            string ruleId,
            string sourceId,
            string placeId,
            string note,
            Vector3 position,
            int severity)
        {
            if (log == null)
            {
                return string.Empty;
            }

            string eventId = Guid.NewGuid().ToString("N");
            log.RecordEvent(new EventRecord
            {
                id = eventId,
                actorId = string.IsNullOrEmpty(actorId) ? "System" : actorId,
                actorRole = string.IsNullOrEmpty(actorRole) ? "System" : actorRole,
                targetId = targetId ?? string.Empty,
                eventType = type,
                ruleId = ruleId ?? string.Empty,
                sourceId = sourceId ?? string.Empty,
                topic = string.IsNullOrEmpty(ruleId) ? type.ToString() : ruleId,
                note = note ?? string.Empty,
                severity = Mathf.Clamp(severity, 0, 3),
                placeId = placeId ?? string.Empty,
                position = position
            });

            return eventId;
        }
    }
}
