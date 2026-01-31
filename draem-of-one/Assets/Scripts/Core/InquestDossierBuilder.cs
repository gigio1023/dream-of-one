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

            dossier.Score = InquestVerdictRules.ComputeScore(
                dossier.Exposure,
                dossier.GlobalSuspicion,
                dossier.EvidenceCount,
                dossier.SeveritySum,
                dossier.DefenseCount);

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
            dossier.Reasons.Add($"Exposure {dossier.Exposure}");
            dossier.Reasons.Add($"GlobalSuspicion {(dossier.GlobalSuspicion * 100f):0}%");
            dossier.Reasons.Add($"Evidence {dossier.EvidenceCount}");
            dossier.Reasons.Add($"Defense {dossier.DefenseCount}");
            dossier.Reasons.Add($"Severity {dossier.SeveritySum}");
            dossier.Reasons.Add($"Score {dossier.Score}");
        }
    }
}
