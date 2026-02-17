using UnityEngine;

namespace DreamOfOne.Core
{
    public readonly struct InquestScoreBreakdown
    {
        public int ExposureRaw { get; }
        public int ExposureContribution { get; }
        public float SuspicionRaw { get; }
        public int SuspicionContribution { get; }
        public int EvidenceRaw { get; }
        public int EvidenceContribution { get; }
        public int SeverityRaw { get; }
        public int SeverityContribution { get; }
        public int DefenseRaw { get; }
        public int DefenseContribution { get; }
        public int TotalScore { get; }
        public InquestVerdict ScoreBand { get; }
        public string NextThresholdLabel { get; }
        public int NextThresholdValue { get; }
        public int DeltaToNextThreshold { get; }
        public int BandFloorValue { get; }
        public int DeltaFromBandFloor { get; }

        public InquestScoreBreakdown(
            int exposureRaw,
            int exposureContribution,
            float suspicionRaw,
            int suspicionContribution,
            int evidenceRaw,
            int evidenceContribution,
            int severityRaw,
            int severityContribution,
            int defenseRaw,
            int defenseContribution,
            int totalScore,
            InquestVerdict scoreBand,
            string nextThresholdLabel,
            int nextThresholdValue,
            int deltaToNextThreshold,
            int bandFloorValue,
            int deltaFromBandFloor)
        {
            ExposureRaw = exposureRaw;
            ExposureContribution = exposureContribution;
            SuspicionRaw = suspicionRaw;
            SuspicionContribution = suspicionContribution;
            EvidenceRaw = evidenceRaw;
            EvidenceContribution = evidenceContribution;
            SeverityRaw = severityRaw;
            SeverityContribution = severityContribution;
            DefenseRaw = defenseRaw;
            DefenseContribution = defenseContribution;
            TotalScore = totalScore;
            ScoreBand = scoreBand;
            NextThresholdLabel = nextThresholdLabel;
            NextThresholdValue = nextThresholdValue;
            DeltaToNextThreshold = deltaToNextThreshold;
            BandFloorValue = bandFloorValue;
            DeltaFromBandFloor = deltaFromBandFloor;
        }
    }

    public static class InquestVerdictRules
    {
        public const int ExposureWeight = 1;
        public const int SuspicionWeight = 40;
        public const int EvidenceWeight = 6;
        public const int SeverityWeight = 2;
        public const int DefenseWeight = 5;

        public const int WarningThreshold = 60;
        public const int DetainedThreshold = 120;
        public const int LucidThreshold = 160;

        public static int ComputeScore(int exposure, float globalSuspicion, int evidenceCount, int severitySum, int defenseCount)
        {
            return BuildBreakdown(exposure, globalSuspicion, evidenceCount, severitySum, defenseCount).TotalScore;
        }

        public static InquestVerdict ResolveVerdict(int exposure, int score)
        {
            if (exposure >= 100 || score >= LucidThreshold)
            {
                return InquestVerdict.LucidIdentified;
            }

            if (score >= DetainedThreshold)
            {
                return InquestVerdict.Detained;
            }

            if (score >= WarningThreshold)
            {
                return InquestVerdict.Warning;
            }

            return InquestVerdict.Cleared;
        }

        public static bool IsExposureOverride(int exposure, int score)
        {
            return exposure >= 100 && score < LucidThreshold;
        }

        public static InquestScoreBreakdown BuildBreakdown(int exposure, float globalSuspicion, int evidenceCount, int severitySum, int defenseCount)
        {
            int exposureContribution = exposure * ExposureWeight;
            int suspicionContribution = Mathf.RoundToInt(globalSuspicion * SuspicionWeight);
            int evidenceContribution = evidenceCount * EvidenceWeight;
            int severityContribution = severitySum * SeverityWeight;
            int defenseContribution = -(defenseCount * DefenseWeight);
            int total = exposureContribution
                + suspicionContribution
                + evidenceContribution
                + severityContribution
                + defenseContribution;

            InquestVerdict band = ResolveScoreBand(total);
            (string nextLabel, int nextValue) = ResolveNextThreshold(band);
            int deltaToNext = nextValue > 0 ? Mathf.Max(0, nextValue - total) : 0;
            int floor = ResolveBandFloor(band);
            int deltaFromFloor = Mathf.Max(0, total - floor);

            return new InquestScoreBreakdown(
                exposure,
                exposureContribution,
                globalSuspicion,
                suspicionContribution,
                evidenceCount,
                evidenceContribution,
                severitySum,
                severityContribution,
                defenseCount,
                defenseContribution,
                total,
                band,
                nextLabel,
                nextValue,
                deltaToNext,
                floor,
                deltaFromFloor);
        }

        private static InquestVerdict ResolveScoreBand(int score)
        {
            if (score >= LucidThreshold)
            {
                return InquestVerdict.LucidIdentified;
            }

            if (score >= DetainedThreshold)
            {
                return InquestVerdict.Detained;
            }

            if (score >= WarningThreshold)
            {
                return InquestVerdict.Warning;
            }

            return InquestVerdict.Cleared;
        }

        private static int ResolveBandFloor(InquestVerdict band)
        {
            return band switch
            {
                InquestVerdict.Warning => WarningThreshold,
                InquestVerdict.Detained => DetainedThreshold,
                InquestVerdict.LucidIdentified => LucidThreshold,
                _ => 0
            };
        }

        private static (string label, int threshold) ResolveNextThreshold(InquestVerdict band)
        {
            return band switch
            {
                InquestVerdict.Cleared => ("Warning", WarningThreshold),
                InquestVerdict.Warning => ("Detained", DetainedThreshold),
                InquestVerdict.Detained => ("Lucid identified", LucidThreshold),
                _ => ("Max", 0)
            };
        }
    }
}
