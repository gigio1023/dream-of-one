namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Stable detector ID strings used by Dream Laws.
    /// These are referenced by design docs and content assets.
    /// </summary>
    public static class DreamLawDetectorIds
    {
        // Speech detectors.
        public const string SpeechDreamTalk = "DET_SPEECH_DREAM_TALK";
        public const string SpeechRealityTest = "DET_SPEECH_REALITY_TEST";
        public const string SpeechMetaLogic = "DET_SPEECH_META_LOGIC";
        public const string SpeechTimelineProbe = "DET_SPEECH_TIMELINE_PROBE";

        // Procedure detectors (Phase 3+).
        public const string ProcQueueSkip = "DET_PROC_QUEUE_SKIP";
        public const string ProcLabelTamper = "DET_PROC_LABEL_TAMPER";
        public const string ProcRcBeforeApproval = "DET_PROC_RC_BEFORE_APPROVAL";
        public const string ProcUnauthorizedPhoto = "DET_PROC_UNAUTHORIZED_PHOTO";

        // Repetition / authority detectors (Phase 3+).
        public const string RepeatLoop = "DET_REPEAT_LOOP";
        public const string AuthorityMismatch = "DET_AUTHORITY_MISMATCH";
    }
}

