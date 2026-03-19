using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class InquestExplainabilityTests
    {
        [Test]
        public void BuildBreakdown_MatchesDeterministicScoreMath()
        {
            const int exposure = 30;
            const float suspicion = 0.4f;
            const int evidence = 3;
            const int severity = 4;
            const int defense = 1;

            var breakdown = InquestVerdictRules.BuildBreakdown(exposure, suspicion, evidence, severity, defense);
            int score = InquestVerdictRules.ComputeScore(exposure, suspicion, evidence, severity, defense);

            Assert.AreEqual(score, breakdown.TotalScore);
            Assert.AreEqual(exposure, breakdown.ExposureRaw);
            Assert.AreEqual(exposure * InquestVerdictRules.ExposureWeight, breakdown.ExposureContribution);
            Assert.AreEqual(Mathf.RoundToInt(suspicion * InquestVerdictRules.SuspicionWeight), breakdown.SuspicionContribution);
            Assert.AreEqual(evidence * InquestVerdictRules.EvidenceWeight, breakdown.EvidenceContribution);
            Assert.AreEqual(severity * InquestVerdictRules.SeverityWeight, breakdown.SeverityContribution);
            Assert.AreEqual(-(defense * InquestVerdictRules.DefenseWeight), breakdown.DefenseContribution);
        }

        [Test]
        public void BuildBreakdown_ReportsRiskBandAndNextThresholdDelta()
        {
            var breakdown = InquestVerdictRules.BuildBreakdown(
                exposure: 20,
                globalSuspicion: 0.5f,
                evidenceCount: 4,
                severitySum: 0,
                defenseCount: 0);

            Assert.AreEqual(64, breakdown.TotalScore);
            Assert.AreEqual(InquestVerdict.Warning, breakdown.ScoreBand);
            Assert.AreEqual("Detained", breakdown.NextThresholdLabel);
            Assert.AreEqual(InquestVerdictRules.DetainedThreshold, breakdown.NextThresholdValue);
            Assert.AreEqual(56, breakdown.DeltaToNextThreshold);
            Assert.AreEqual(InquestVerdictRules.WarningThreshold, breakdown.BandFloorValue);
            Assert.AreEqual(4, breakdown.DeltaFromBandFloor);
        }

        [Test]
        public void BuildOneLineReason_UsesExposureOverrideWhenApplicable()
        {
            var breakdown = InquestVerdictRules.BuildBreakdown(
                exposure: 20,
                globalSuspicion: 0f,
                evidenceCount: 1,
                severitySum: 0,
                defenseCount: 0);

            var dossier = new InquestDossier
            {
                Exposure = 100,
                Score = breakdown.TotalScore,
                Breakdown = breakdown,
                ExposureOverride = true
            };

            string reason = InquestDossierFormatter.BuildOneLineReason(dossier);
            StringAssert.Contains("exposure-override", reason);
        }

        [Test]
        public void BuildSummary_IncludesDeterministicWhyBlock()
        {
            var breakdown = InquestVerdictRules.BuildBreakdown(
                exposure: 30,
                globalSuspicion: 0.2f,
                evidenceCount: 2,
                severitySum: 3,
                defenseCount: 1);

            var dossier = new InquestDossier
            {
                placeId = "Station",
                topic = "DL_G1_NO_DREAM_TALK",
                Exposure = 30,
                GlobalSuspicion = 0.2f,
                EvidenceCount = 2,
                DefenseCount = 1,
                SeveritySum = 3,
                Score = breakdown.TotalScore,
                Breakdown = breakdown,
                Verdict = InquestVerdict.Warning
            };

            string summary = InquestDossierFormatter.BuildSummary(dossier);
            StringAssert.Contains("Why (deterministic):", summary);
            StringAssert.Contains("Terms:", summary);
            StringAssert.Contains("Score band:", summary);
            StringAssert.Contains("Next:", summary);
        }
    }
}
