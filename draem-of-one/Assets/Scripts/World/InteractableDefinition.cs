using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Interactable Definition", fileName = "InteractableDefinition")]
    public sealed class InteractableDefinition : ScriptableObject
    {
        [SerializeField]
        private string interactableId = "Interactable";

        [SerializeField]
        private string anchorName = "StoreBuilding";

        [SerializeField]
        private GameObject prefab = null;

        [SerializeField]
        private Vector3 localOffset = Vector3.zero;

        [SerializeField]
        private Vector3 localRotationEuler = Vector3.zero;

        [SerializeField]
        private string ruleId = string.Empty;

        [SerializeField]
        private string artifactId = string.Empty;

        [SerializeField]
        private DreamOfOne.Core.EventType eventType = DreamOfOne.Core.EventType.ViolationDetected;

        [SerializeField]
        private DreamOfOne.Core.EventCategory eventCategory = DreamOfOne.Core.EventCategory.Rule;

        [SerializeField]
        private DreamOfOne.Core.ZoneType zoneType = DreamOfOne.Core.ZoneType.None;

        [SerializeField]
        private string prompt = "E: Interact";

        [SerializeField]
        private string promptTemplate = string.Empty;

        [SerializeField]
        private string[] verbs = System.Array.Empty<string>();

        [SerializeField]
        private string stateMachineId = string.Empty;

        [SerializeField]
        private string[] emittedEvents = System.Array.Empty<string>();

        [SerializeField]
        private string[] artifactRules = System.Array.Empty<string>();

        [SerializeField]
        private string note = string.Empty;

        [SerializeField]
        private int severity = 2;

        [SerializeField]
        private string placeId = string.Empty;

        [SerializeField]
        private Vector3 triggerSize = new Vector3(2f, 2f, 2f);

        public string InteractableId => interactableId;
        public string AnchorName => anchorName;
        public GameObject Prefab => prefab;
        public Vector3 LocalOffset => localOffset;
        public Vector3 LocalRotationEuler => localRotationEuler;
        public string RuleId => ruleId;
        public string ArtifactId => artifactId;
        public DreamOfOne.Core.EventType EventType => eventType;
        public DreamOfOne.Core.EventCategory EventCategory => eventCategory;
        public DreamOfOne.Core.ZoneType ZoneType => zoneType;
        public string Prompt => prompt;
        public string PromptTemplate => promptTemplate;
        public string[] Verbs => verbs;
        public string StateMachineId => stateMachineId;
        public string[] EmittedEvents => emittedEvents;
        public string[] ArtifactRules => artifactRules;
        public string Note => note;
        public int Severity => severity;
        public string PlaceId => placeId;
        public Vector3 TriggerSize => triggerSize;
    }
}
