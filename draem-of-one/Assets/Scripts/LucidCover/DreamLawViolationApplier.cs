using System;
using System.Collections.Generic;
using DreamOfOne.Core;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Applies DreamLawEvaluator hits to the core systems (WEL + Exposure).
    /// This is a minimal Phase 2 bridge; full TextSurface UI comes in Phase 3.
    /// </summary>
    public sealed class DreamLawViolationApplier
    {
        private readonly DreamLawEvaluator evaluator = new();
        private readonly List<DreamLawHit> hits = new();

        public IReadOnlyList<DreamLawHit> LastHits => hits;

        public void ApplySpeech(
            DreamLawDatabase database,
            WorldEventLog eventLog,
            ExposureSystem exposureSystem,
            SpeechAct speechAct,
            string utterance,
            string placeId,
            string witnessId,
            string witnessRole,
            Vector3 position)
        {
            hits.Clear();

            if (database == null || eventLog == null)
            {
                return;
            }

            evaluator.Evaluate(database, speechAct, utterance, placeId, hits);
            if (hits.Count == 0)
            {
                return;
            }

            witnessId = string.IsNullOrEmpty(witnessId) ? "Witness" : witnessId;
            witnessRole = string.IsNullOrEmpty(witnessRole) ? "Citizen" : witnessRole;
            placeId ??= string.Empty;

            for (int i = 0; i < hits.Count; i++)
            {
                ApplyHit(hits[i], eventLog, exposureSystem, placeId, witnessId, witnessRole, position);
            }
        }

        private static void ApplyHit(
            DreamLawHit hit,
            WorldEventLog eventLog,
            ExposureSystem exposureSystem,
            string placeId,
            string witnessId,
            string witnessRole,
            Vector3 position)
        {
            var law = hit.Law;
            if (law == null)
            {
                return;
            }

            // Minimal evidence: create a witness statement artifact event and link it from the violation record.
            string statementEventId = Guid.NewGuid().ToString("N");
            string statementNote = string.IsNullOrEmpty(law.CanonicalLineTemplate)
                ? $"Witness statement for {law.DreamLawId}."
                : law.CanonicalLineTemplate;

            eventLog.RecordEvent(new EventRecord
            {
                id = statementEventId,
                actorId = witnessId,
                actorRole = witnessRole,
                targetId = "PLAYER",
                eventType = CoreEventType.StatementGiven,
                ruleId = law.DreamLawId,
                sourceId = hit.DetectorId,
                topic = law.DreamLawId,
                note = statementNote,
                severity = Mathf.Clamp(hit.EventSeverity, 1, 3),
                trust = 1f,
                placeId = placeId,
                position = position
            });

            string violationNote = $"det={hit.DetectorId}; stmt={statementEventId}";
            if (hit.StationMultiplierApplied)
            {
                violationNote += "; x1.5";
            }

            eventLog.RecordEvent(new EventRecord
            {
                actorId = witnessId,
                actorRole = witnessRole,
                targetId = "PLAYER",
                eventType = CoreEventType.ViolationDetected,
                ruleId = law.DreamLawId,
                sourceId = hit.DetectorId,
                topic = law.DreamLawId,
                delta = hit.SuspicionDelta,
                note = violationNote,
                severity = Mathf.Clamp(hit.EventSeverity, 0, 3),
                trust = 1f,
                placeId = placeId,
                position = position
            });

            if (exposureSystem != null)
            {
                exposureSystem.AddExposure(hit.ExposureDelta, witnessId, placeId, law.DreamLawId, hit.DetectorId, position);
            }
        }
    }
}
