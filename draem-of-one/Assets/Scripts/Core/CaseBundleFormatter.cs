using System.Text;
using UnityEngine;

namespace DreamOfOne.Core
{
    public static class CaseBundleFormatter
    {
        public static string BuildSummary(CaseBundle bundle)
        {
            if (bundle == null)
            {
                return string.Empty;
            }

            var sb = new StringBuilder();
            sb.Append("사건 묶음");
            if (!string.IsNullOrEmpty(bundle.placeId))
            {
                sb.Append($" [{bundle.placeId}]");
            }

            if (!string.IsNullOrEmpty(bundle.topic))
            {
                sb.Append($" {bundle.topic}");
            }

            sb.Append("\n");
            sb.Append($"신고:{bundle.reports.Count}  위반:{bundle.violations.Count}  증거:{bundle.evidence.Count}");
            if (bundle.procedures.Count > 0)
            {
                sb.Append($"  절차:{bundle.procedures.Count}");
            }
            if (bundle.statements.Count > 0)
            {
                sb.Append($"  진술:{bundle.statements.Count}");
            }
            if (bundle.explanations.Count > 0)
            {
                sb.Append($"  해명:{bundle.explanations.Count}");
            }
            if (bundle.rebuttals.Count > 0)
            {
                sb.Append($"  반박:{bundle.rebuttals.Count}");
            }

            sb.Append($"  점수:{bundle.Score}");

            AppendRuleSummary(sb, bundle);

            AppendDetailLines(sb, "증거", bundle.evidence, 2);
            AppendDetailLines(sb, "신고", bundle.reports, 2);
            AppendDetailLines(sb, "위반", bundle.violations, 2);
            AppendDetailLines(sb, "진술", bundle.statements, 1);
            AppendDetailLines(sb, "해명", bundle.explanations, 1);
            AppendDetailLines(sb, "반박", bundle.rebuttals, 1);

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

            sb.Append("\n규칙: ");
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
                sb.Append($"\n{label}: [{rule}] {actor} - {note}");
            }
        }
    }
}
