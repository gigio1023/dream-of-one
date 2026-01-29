using UnityEngine;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Dream-only rule definition (deterministic). The player being "too aware" of this rule
    /// increases Suspicion/Exposure depending on detectors.
    /// </summary>
    [CreateAssetMenu(menuName = "DreamOfOne/LucidCover/Dream Law", fileName = "DreamLawDefinition")]
    public sealed class DreamLawDefinition : ScriptableObject
    {
        [SerializeField]
        private string dreamLawId = "DL_G1_NO_DREAM_TALK";

        [SerializeField]
        private DreamLawCategory category = DreamLawCategory.Speech;

        [SerializeField]
        private DreamLawScopeKind scopeKind = DreamLawScopeKind.Global;

        [SerializeField]
        [Tooltip("If scopeKind == Landmark, the landmark/org id (e.g., Store/Studio/Park/Station).")]
        private string scopeId = string.Empty;

        [SerializeField]
        [Range(0f, 1f)]
        private float severity = 0.5f;

        [SerializeField]
        [Tooltip("Default suspicion delta for this law (context may scale it later).")]
        private int suspicionDelta = 0;

        [SerializeField]
        [Tooltip("Default exposure delta for this law (context may scale it later).")]
        private int exposureDelta = 0;

        [SerializeField]
        [Tooltip("Detectors that can trigger this law hit (IDs).")]
        private string[] detectorIds = System.Array.Empty<string>();

        [SerializeField]
        [TextArea(2, 6)]
        [Tooltip("Design notes for evidence generation policy (deterministic mapping implemented later).")]
        private string evidencePolicy = string.Empty;

        [SerializeField]
        [Tooltip("Canonical log line template (<= 80 chars recommended).")]
        private string canonicalLineTemplate = string.Empty;

        [SerializeField]
        [TextArea(2, 6)]
        [Tooltip("Safe defuse hints in procedural language.")]
        private string defuseHints = string.Empty;

        public string DreamLawId => dreamLawId;
        public DreamLawCategory Category => category;
        public DreamLawScopeKind ScopeKind => scopeKind;
        public string ScopeId => scopeId;
        public float Severity => severity;
        public int SuspicionDelta => suspicionDelta;
        public int ExposureDelta => exposureDelta;
        public string[] DetectorIds => detectorIds;
        public string EvidencePolicy => evidencePolicy;
        public string CanonicalLineTemplate => canonicalLineTemplate;
        public string DefuseHints => defuseHints;
    }
}

