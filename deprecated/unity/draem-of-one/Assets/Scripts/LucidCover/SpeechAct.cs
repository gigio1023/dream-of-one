namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Player speech intent classification used for deterministic rule evaluation.
    /// The free-form text (if any) is styling-only and must not change truth.
    /// </summary>
    public enum SpeechAct
    {
        Comply,
        Inquire,
        Frame,
        Break
    }
}

