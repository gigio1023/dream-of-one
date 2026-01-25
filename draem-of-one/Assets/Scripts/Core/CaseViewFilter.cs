namespace DreamOfOne.Core
{
    public enum CaseViewFilter
    {
        All,
        Evidence,
        Violations,
        Witnesses
    }

    public static class CaseViewFilterExtensions
    {
        public static CaseViewFilter Next(this CaseViewFilter filter)
        {
            return filter switch
            {
                CaseViewFilter.All => CaseViewFilter.Evidence,
                CaseViewFilter.Evidence => CaseViewFilter.Violations,
                CaseViewFilter.Violations => CaseViewFilter.Witnesses,
                _ => CaseViewFilter.All
            };
        }
    }
}
