using System;
using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Deterministically evaluates Dream Laws based on (speech act + utterance + context).
    /// Truth transitions (deltas, evidence triggers) must remain deterministic.
    /// </summary>
    public sealed class DreamLawEvaluator
    {
        private const float StationMultiplier = 1.5f;

        /// <summary>
        /// Evaluate laws in database order; the first matching detectorId per law is selected.
        /// </summary>
        public void Evaluate(
            DreamLawDatabase database,
            SpeechAct speechAct,
            string utterance,
            string placeId,
            List<DreamLawHit> results)
        {
            if (results == null)
            {
                return;
            }

            results.Clear();

            if (database == null)
            {
                return;
            }

            var laws = database.DreamLaws;
            if (laws == null)
            {
                return;
            }

            utterance ??= string.Empty;
            placeId ??= string.Empty;

            for (int i = 0; i < laws.Count; i++)
            {
                var law = laws[i];
                if (law == null)
                {
                    continue;
                }

                if (!MatchesScope(law, placeId))
                {
                    continue;
                }

                string detectorId = SelectFirstTriggeredDetector(law, speechAct, utterance);
                if (string.IsNullOrEmpty(detectorId))
                {
                    continue;
                }

                bool stationBoost = IsStationContext(placeId) && IsStationWeightedLaw(law.DreamLawId);
                float multiplier = stationBoost ? StationMultiplier : 1f;

                int suspicionDelta = Mathf.RoundToInt(law.SuspicionDelta * multiplier);
                int exposureDelta = Mathf.RoundToInt(law.ExposureDelta * multiplier);
                int severity = ToEventSeverity(law.Severity);

                results.Add(new DreamLawHit(law, detectorId, suspicionDelta, exposureDelta, severity, stationBoost));
            }
        }

        private static bool MatchesScope(DreamLawDefinition law, string placeId)
        {
            if (law == null)
            {
                return false;
            }

            if (law.ScopeKind == DreamLawScopeKind.Global)
            {
                return true;
            }

            if (law.ScopeKind == DreamLawScopeKind.Landmark)
            {
                return !string.IsNullOrEmpty(law.ScopeId)
                    && !string.IsNullOrEmpty(placeId)
                    && string.Equals(law.ScopeId, placeId, StringComparison.OrdinalIgnoreCase);
            }

            return true;
        }

        private static string SelectFirstTriggeredDetector(DreamLawDefinition law, SpeechAct speechAct, string utterance)
        {
            if (law == null || law.DetectorIds == null || law.DetectorIds.Length == 0)
            {
                return string.Empty;
            }

            for (int i = 0; i < law.DetectorIds.Length; i++)
            {
                string detectorId = law.DetectorIds[i];
                if (DreamLawSpeechDetectors.IsTriggered(detectorId, speechAct, utterance))
                {
                    return detectorId;
                }
            }

            return string.Empty;
        }

        private static bool IsStationContext(string placeId)
        {
            return !string.IsNullOrEmpty(placeId)
                && string.Equals(placeId, "Station", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsStationWeightedLaw(string lawId)
        {
            return string.Equals(lawId, "DL_G1_NO_DREAM_TALK", StringComparison.OrdinalIgnoreCase)
                || string.Equals(lawId, "DL_G2_NO_REALITY_TEST", StringComparison.OrdinalIgnoreCase);
        }

        private static int ToEventSeverity(float severity01)
        {
            if (severity01 >= 0.85f)
            {
                return 3;
            }

            if (severity01 >= 0.55f)
            {
                return 2;
            }

            if (severity01 > 0f)
            {
                return 1;
            }

            return 0;
        }
    }
}

