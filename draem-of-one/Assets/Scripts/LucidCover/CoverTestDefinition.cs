using UnityEngine;

namespace DreamOfOne.LucidCover
{
    [CreateAssetMenu(menuName = "DreamOfOne/LucidCover/Cover Test", fileName = "CoverTestDefinition")]
    public sealed class CoverTestDefinition : ScriptableObject
    {
        [SerializeField]
        private string coverTestId = "CT_STORE_QUEUE_LANGUAGE";

        [SerializeField]
        [TextArea(1, 4)]
        private string location = string.Empty;

        [SerializeField]
        [TextArea(2, 6)]
        private string purpose = string.Empty;

        [SerializeField]
        private string[] dreamLawIds = System.Array.Empty<string>();

        [SerializeField]
        private string[] requiredActors = System.Array.Empty<string>();

        [SerializeField]
        private string[] requiredTextSurfaces = System.Array.Empty<string>();

        [SerializeField]
        [TextArea(1, 4)]
        private string playerChecklistStep = string.Empty;

        [SerializeField]
        private string[] triggerDetectorIds = System.Array.Empty<string>();

        [SerializeField]
        [TextArea(3, 8)]
        private string escalationLadder = string.Empty;

        [SerializeField]
        [TextArea(2, 8)]
        private string artifactsGenerated = string.Empty;

        [SerializeField]
        [TextArea(2, 8)]
        private string defuseOptions = string.Empty;

        [SerializeField]
        [TextArea(2, 6)]
        private string failureCondition = string.Empty;

        [SerializeField]
        [TextArea(2, 6)]
        private string expectedCanonicalLines = string.Empty;

        [SerializeField]
        [TextArea(2, 6)]
        private string mcssValidation = string.Empty;

        public string CoverTestId => coverTestId;
        public string Location => location;
        public string Purpose => purpose;
        public string[] DreamLawIds => dreamLawIds;
        public string[] RequiredActors => requiredActors;
        public string[] RequiredTextSurfaces => requiredTextSurfaces;
        public string PlayerChecklistStep => playerChecklistStep;
        public string[] TriggerDetectorIds => triggerDetectorIds;
        public string EscalationLadder => escalationLadder;
        public string ArtifactsGenerated => artifactsGenerated;
        public string DefuseOptions => defuseOptions;
        public string FailureCondition => failureCondition;
        public string ExpectedCanonicalLines => expectedCanonicalLines;
        public string McssValidation => mcssValidation;
    }
}

