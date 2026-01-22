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

            sb.Append($"  점수:{bundle.Score}");

            AppendDetailLines(sb, "증거", bundle.evidence, 2);
            AppendDetailLines(sb, "신고", bundle.reports, 2);
            AppendDetailLines(sb, "위반", bundle.violations, 2);

            return sb.ToString();
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

            sb.Append($"\n{label}: {record.note}");
            }
        }
    }
}
