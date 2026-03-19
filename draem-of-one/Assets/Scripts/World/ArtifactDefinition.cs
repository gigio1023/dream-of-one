using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Artifact Definition", fileName = "ArtifactDefinition")]
    public sealed class ArtifactDefinition : ScriptableObject
    {
        [SerializeField]
        private string artifactId = "Artifact";

        [SerializeField]
        private string displayName = "Artifact";

        [SerializeField]
        private DreamOfOne.Core.EventType sourceEvent = DreamOfOne.Core.EventType.EvidenceCaptured;

        [SerializeField]
        private GameObject prefab = null;

        [SerializeField]
        private string state = "New";

        [SerializeField]
        private float ttlSeconds = 600f;

        [SerializeField]
        private string inspectTextTemplate = string.Empty;

        [SerializeField]
        private string[] links = System.Array.Empty<string>();

        public string ArtifactId => artifactId;
        public string DisplayName => displayName;
        public DreamOfOne.Core.EventType SourceEvent => sourceEvent;
        public GameObject Prefab => prefab;
        public string State => state;
        public float TtlSeconds => ttlSeconds;
        public string InspectTextTemplate => inspectTextTemplate;
        public string[] Links => links;
    }
}
