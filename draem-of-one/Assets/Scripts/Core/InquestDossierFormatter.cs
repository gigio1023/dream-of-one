using System.Text;
using UnityEngine;

namespace DreamOfOne.Core
{
    public static class InquestDossierFormatter
    {
        public static string BuildSummary(InquestDossier dossier, ArtifactSystem artifactSystem = null)
        {
            if (dossier == null)
            {
                return string.Empty;
            }

            var sb = new StringBuilder();
            sb.Append("Inquest Dossier");
            if (!string.IsNullOrEmpty(dossier.placeId))
            {
                sb.Append($" [{dossier.placeId}]");
            }
            if (!string.IsNullOrEmpty(dossier.topic))
            {
                sb.Append($" {dossier.topic}");
            }

            sb.Append("\n");
            sb.Append($"Verdict: {FormatVerdict(dossier.Verdict)} (Score {dossier.Score})");
            sb.Append($"\nExposure:{dossier.Exposure}  G:{dossier.GlobalSuspicion:P0}  Evidence:{dossier.EvidenceCount}  Defense:{dossier.DefenseCount}  Severity:{dossier.SeveritySum}");

            if (dossier.Reasons.Count > 0)
            {
                sb.Append("\nWhy:");
                for (int i = 0; i < dossier.Reasons.Count; i++)
                {
                    sb.Append($" {dossier.Reasons[i]}");
                }
            }

            AppendViolations(sb, dossier.CaseBundle);
            AppendStatements(sb, dossier.CaseBundle);
            AppendDefense(sb, dossier.CaseBundle);
            AppendArtifacts(sb, artifactSystem);

            return sb.ToString();
        }

        private static string FormatVerdict(InquestVerdict verdict)
        {
            return verdict switch
            {
                InquestVerdict.LucidIdentified => "Lucid identified",
                InquestVerdict.Detained => "Detained",
                InquestVerdict.Warning => "Warning",
                _ => "Cleared"
            };
        }

        private static void AppendViolations(StringBuilder sb, CaseBundle bundle)
        {
            if (bundle == null || bundle.violations.Count == 0)
            {
                return;
            }

            int count = Mathf.Min(3, bundle.violations.Count);
            for (int i = 0; i < count; i++)
            {
                var record = bundle.violations[i];
                if (record == null)
                {
                    continue;
                }

                string rule = string.IsNullOrEmpty(record.ruleId) ? "-" : record.ruleId;
                string detector = string.IsNullOrEmpty(record.sourceId) ? "-" : record.sourceId;
                string witness = string.IsNullOrEmpty(record.actorId) ? "-" : record.actorId;
                sb.Append($"\nViolation: [{rule}] det={detector} w={witness}");
            }
        }

        private static void AppendStatements(StringBuilder sb, CaseBundle bundle)
        {
            if (bundle == null || bundle.statements.Count == 0)
            {
                return;
            }

            int count = Mathf.Min(3, bundle.statements.Count);
            for (int i = 0; i < count; i++)
            {
                var record = bundle.statements[i];
                if (record == null)
                {
                    continue;
                }

                string rule = string.IsNullOrEmpty(record.ruleId) ? "-" : record.ruleId;
                string detector = string.IsNullOrEmpty(record.sourceId) ? "-" : record.sourceId;
                string witness = string.IsNullOrEmpty(record.actorId) ? "-" : record.actorId;
                sb.Append($"\nStatement: [{rule}] det={detector} w={witness}");
            }
        }

        private static void AppendDefense(StringBuilder sb, CaseBundle bundle)
        {
            if (bundle == null)
            {
                return;
            }

            int count = bundle.explanations.Count + bundle.rebuttals.Count;
            if (count == 0)
            {
                return;
            }

            int printed = 0;
            for (int i = 0; i < bundle.explanations.Count && printed < 2; i++)
            {
                var record = bundle.explanations[i];
                if (record == null)
                {
                    continue;
                }

                sb.Append($"\nDefense: {record.note}");
                printed++;
            }

            for (int i = 0; i < bundle.rebuttals.Count && printed < 2; i++)
            {
                var record = bundle.rebuttals[i];
                if (record == null)
                {
                    continue;
                }

                sb.Append($"\nDefense: {record.note}");
                printed++;
            }
        }

        private static void AppendArtifacts(StringBuilder sb, ArtifactSystem artifactSystem)
        {
            if (artifactSystem == null)
            {
                return;
            }

            var artifacts = artifactSystem.GetArtifacts();
            if (artifacts == null || artifacts.Count == 0)
            {
                return;
            }

            int count = Mathf.Min(4, artifacts.Count);
            sb.Append("\nArtifacts:");
            for (int i = 0; i < count; i++)
            {
                var artifact = artifacts[i];
                sb.Append($"\n- {artifact.ArtifactId} ({artifact.PlaceId}) {artifact.Summary}");
            }
        }
    }
}
