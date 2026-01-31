using UnityEngine;

namespace DreamOfOne.Core
{
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
            int suspicionScore = Mathf.RoundToInt(globalSuspicion * SuspicionWeight);
            return exposure * ExposureWeight
                + suspicionScore
                + (evidenceCount * EvidenceWeight)
                + (severitySum * SeverityWeight)
                - (defenseCount * DefenseWeight);
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
    }
}
