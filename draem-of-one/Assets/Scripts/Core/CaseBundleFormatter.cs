using System.Text;
using DreamOfOne.Localization;
using UnityEngine;

namespace DreamOfOne.Core
{
    public static class CaseBundleFormatter
    {
        public static string BuildSummary(CaseBundle bundle, CaseViewFilter filter = CaseViewFilter.All)
        {
            if (bundle == null)
            {
                return string.Empty;
            }

            var sb = new StringBuilder();
            string title = LocalizationManager.Text(LocalizationKey.CaseSummaryTitle);
            string filterLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryFilterLabel);
            sb.Append(title);
            if (!string.IsNullOrEmpty(bundle.placeId))
            {
                sb.Append($" [{bundle.placeId}]");
            }

            if (!string.IsNullOrEmpty(bundle.topic))
            {
                sb.Append($" {bundle.topic}");
            }

            sb.Append("\n");
            string reportsLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryReportsLabel);
            string violationsLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryViolationsLabel);
            string evidenceLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryEvidenceLabel);
            string proceduresLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryProceduresLabel);
            string statementsLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryStatementsLabel);
            string explanationsLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryExplanationsLabel);
            string rebuttalsLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryRebuttalsLabel);
            string scoreLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryScoreLabel);

            sb.Append($"{reportsLabel}:{bundle.reports.Count}  {violationsLabel}:{bundle.violations.Count}  {evidenceLabel}:{bundle.evidence.Count}");
            if (bundle.procedures.Count > 0)
            {
                sb.Append($"  {proceduresLabel}:{bundle.procedures.Count}");
            }
            if (bundle.statements.Count > 0)
            {
                sb.Append($"  {statementsLabel}:{bundle.statements.Count}");
            }
            if (bundle.explanations.Count > 0)
            {
                sb.Append($"  {explanationsLabel}:{bundle.explanations.Count}");
            }
            if (bundle.rebuttals.Count > 0)
            {
                sb.Append($"  {rebuttalsLabel}:{bundle.rebuttals.Count}");
            }

            sb.Append($"  {scoreLabel}:{bundle.Score}");

            sb.Append($"\n{filterLabel}: {GetFilterLabel(filter)}");

            AppendRuleSummary(sb, bundle);

            bool showAll = filter == CaseViewFilter.All;
            if (showAll || filter == CaseViewFilter.Evidence)
            {
                AppendDetailLines(sb, evidenceLabel, bundle.evidence, 3);
            }
            if (showAll || filter == CaseViewFilter.Violations)
            {
                AppendDetailLines(sb, violationsLabel, bundle.violations, 3);
                AppendDetailLines(sb, reportsLabel, bundle.reports, 2);
            }
            if (showAll || filter == CaseViewFilter.Witnesses)
            {
                AppendDetailLines(sb, statementsLabel, bundle.statements, 2);
                AppendDetailLines(sb, explanationsLabel, bundle.explanations, 2);
                AppendDetailLines(sb, rebuttalsLabel, bundle.rebuttals, 2);
            }

            return sb.ToString();
        }

        private static void AppendRuleSummary(StringBuilder sb, CaseBundle bundle)
        {
            if (bundle == null)
            {
                return;
            }

            var rules = new System.Collections.Generic.HashSet<string>();
            CollectRules(rules, bundle.violations);
            CollectRules(rules, bundle.evidence);
            CollectRules(rules, bundle.reports);

            if (rules.Count == 0)
            {
                return;
            }

            string rulesLabel = LocalizationManager.Text(LocalizationKey.CaseSummaryRulesLabel);
            sb.Append($"\n{rulesLabel}: ");
            int count = 0;
            foreach (var rule in rules)
            {
                if (count > 0)
                {
                    sb.Append(", ");
                }
                sb.Append(rule);
                count++;
                if (count >= 4)
                {
                    break;
                }
            }
        }

        private static void CollectRules(System.Collections.Generic.HashSet<string> rules, System.Collections.Generic.List<EventRecord> list)
        {
            if (rules == null || list == null)
            {
                return;
            }

            for (int i = 0; i < list.Count; i++)
            {
                var record = list[i];
                if (record == null)
                {
                    continue;
                }

                if (!string.IsNullOrEmpty(record.ruleId))
                {
                    rules.Add(record.ruleId);
                }
            }
        }

        private static void AppendDetailLines(StringBuilder sb, string label, System.Collections.Generic.List<EventRecord> list, int max)
        {
            if (list == null || list.Count == 0)
            {
                return;
            }

            int count = Mathf.Min(max, list.Count);
            for (int i = 0; i < count; i++)
            {
                var record = list[i];
                if (record == null)
                {
                    continue;
                }

                string actor = string.IsNullOrEmpty(record.actorRole) ? record.actorId : $"{record.actorId}({record.actorRole})";
                string rule = string.IsNullOrEmpty(record.ruleId) ? "-" : record.ruleId;
                string note = string.IsNullOrEmpty(record.note) ? record.eventType.ToString() : record.note;
                string eventLabel = record.eventType.ToString();
                sb.Append($"\n{label}: [{rule}] {actor} -> {eventLabel} ({note})");
            }
        }

        public static string GetFilterLabel(CaseViewFilter filter)
        {
            return filter switch
            {
                CaseViewFilter.All => LocalizationManager.Text(LocalizationKey.CaseFilterAll),
                CaseViewFilter.Evidence => LocalizationManager.Text(LocalizationKey.CaseFilterEvidence),
                CaseViewFilter.Violations => LocalizationManager.Text(LocalizationKey.CaseFilterViolations),
                CaseViewFilter.Witnesses => LocalizationManager.Text(LocalizationKey.CaseFilterWitnesses),
                _ => LocalizationManager.Text(LocalizationKey.CaseFilterAll)
            };
        }
    }
}
