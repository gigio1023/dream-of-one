using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Rule Definition", fileName = "RuleDefinition")]
    public sealed class RuleDefinition : ScriptableObject
    {
        [SerializeField]
        private string ruleId = "Rule";

        [SerializeField]
        private string[] detectors = System.Array.Empty<string>();

        [SerializeField]
        private int severity = 2;

        [SerializeField]
        private float suspicionDelta = 10f;

        [SerializeField]
        private string artifactPolicy = string.Empty;

        [SerializeField]
        private string canonicalLineTemplate = string.Empty;

        public string RuleId => ruleId;
        public string[] Detectors => detectors;
        public int Severity => severity;
        public float SuspicionDelta => suspicionDelta;
        public string ArtifactPolicy => artifactPolicy;
        public string CanonicalLineTemplate => canonicalLineTemplate;
    }
}
