using System;
using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class InquestDossierBuilder
    {
        private readonly WorldEventLog eventLog;
        private readonly ExposureSystem exposureSystem;
        private readonly GlobalSuspicionSystem globalSuspicionSystem;

        public InquestDossierBuilder(WorldEventLog log, ExposureSystem exposure, GlobalSuspicionSystem suspicion)
        {
            eventLog = log;
            exposureSystem = exposure;
            globalSuspicionSystem = suspicion;
        }

        public InquestDossier Build(ReportEnvelope report)
        {
            var dossier = new InquestDossier
            {
                dossierId = report != null ? report.reportId : Guid.NewGuid().ToString("N"),
                topic = report != null ? report.topic : string.Empty,
                placeId = report != null ? report.placeId : string.Empty,
                zoneId = report != null ? report.zoneId : string.Empty
            };

            var bundleBuilder = new CaseBundleBuilder(eventLog);
            dossier.CaseBundle = bundleBuilder.Build(report);

            dossier.Exposure = exposureSystem != null ? exposureSystem.Exposure : 0;
            dossier.GlobalSuspicion = globalSuspicionSystem != null ? globalSuspicionSystem.GlobalSuspicion : 0f;

            var bundle = dossier.CaseBundle;
            dossier.EvidenceCount = CountEvidence(bundle);
            dossier.DefenseCount = CountDefense(bundle);
            dossier.SeveritySum = SumSeverity(bundle);
            dossier.Breakdown = InquestVerdictRules.BuildBreakdown(
                dossier.Exposure,
                dossier.GlobalSuspicion,
                dossier.EvidenceCount,
                dossier.SeveritySum,
                dossier.DefenseCount);

            dossier.Score = dossier.Breakdown.TotalScore;
            dossier.ExposureOverride = InquestVerdictRules.IsExposureOverride(dossier.Exposure, dossier.Score);
            dossier.Verdict = InquestVerdictRules.ResolveVerdict(dossier.Exposure, dossier.Score);

            BuildReasons(dossier);
            return dossier;
        }

        private static int CountEvidence(CaseBundle bundle)
        {
            if (bundle == null)
            {
                return 0;
            }

            return bundle.reports.Count
                + bundle.violations.Count
                + bundle.evidence.Count
                + bundle.statements.Count;
        }

        private static int CountDefense(CaseBundle bundle)
        {
            if (bundle == null)
            {
                return 0;
            }

            return bundle.explanations.Count + bundle.rebuttals.Count;
        }

        private static int SumSeverity(CaseBundle bundle)
        {
            if (bundle == null)
            {
                return 0;
            }

            int sum = 0;
            sum += SumSeverity(bundle.reports);
            sum += SumSeverity(bundle.violations);
            sum += SumSeverity(bundle.evidence);
            sum += SumSeverity(bundle.statements);
            return sum;
        }

        private static int SumSeverity(List<EventRecord> records)
        {
            if (records == null)
            {
                return 0;
            }

            int total = 0;
            for (int i = 0; i < records.Count; i++)
            {
                var record = records[i];
                if (record == null)
                {
                    continue;
                }

                total += record.severity;
            }

            return total;
        }

        private static void BuildReasons(InquestDossier dossier)
        {
            if (dossier == null)
            {
                return;
            }

            dossier.Reasons.Clear();
            dossier.Reasons.Add($"Score {dossier.Score} (band {dossier.Breakdown.ScoreBand})");
            dossier.Reasons.Add($"Terms ex+{dossier.Breakdown.ExposureContribution} sus+{dossier.Breakdown.SuspicionContribution} ev+{dossier.Breakdown.EvidenceContribution} sev+{dossier.Breakdown.SeverityContribution} def{dossier.Breakdown.DefenseContribution}");

            if (dossier.ExposureOverride)
            {
                dossier.Reasons.Add("Exposure override: exposure >= 100");
            }

            if (dossier.Breakdown.NextThresholdValue > 0)
            {
                dossier.Reasons.Add($"Next {dossier.Breakdown.NextThresholdLabel} in {dossier.Breakdown.DeltaToNextThreshold}");
            }
            else
            {
                dossier.Reasons.Add("At highest threshold");
            }
        }
    }
}
