namespace DreamOfOne.Core
{
    public static class CaseVerdict
    {
        public static string DetermineVerdict(CaseBundle bundle, out string reason)
        {
            if (bundle == null)
            {
                reason = "기록 부족";
                return "꿈 속 시민";
            }

            int score = bundle.Score;
            reason = $"신고{bundle.reports.Count}/증거{bundle.evidence.Count}/위반{bundle.violations.Count}";
            if (score >= 6)
            {
                return "퇴출";
            }

            if (score >= 3)
            {
                return "의심 강화";
            }

            if (score >= 2)
            {
                return "보류";
            }

            return "무혐의";
        }
    }
}
