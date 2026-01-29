namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// A single deterministic Dream Law hit produced by DreamLawEvaluator.
    /// </summary>
    public readonly struct DreamLawHit
    {
        public DreamLawDefinition Law { get; }
        public string DetectorId { get; }
        public int SuspicionDelta { get; }
        public int ExposureDelta { get; }
        public int EventSeverity { get; }
        public bool StationMultiplierApplied { get; }

        public DreamLawHit(
            DreamLawDefinition law,
            string detectorId,
            int suspicionDelta,
            int exposureDelta,
            int eventSeverity,
            bool stationMultiplierApplied)
        {
            Law = law;
            DetectorId = detectorId ?? string.Empty;
            SuspicionDelta = suspicionDelta;
            ExposureDelta = exposureDelta;
            EventSeverity = eventSeverity;
            StationMultiplierApplied = stationMultiplierApplied;
        }
    }
}

