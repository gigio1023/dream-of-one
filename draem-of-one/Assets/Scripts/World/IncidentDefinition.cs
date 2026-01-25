using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Incident Definition", fileName = "IncidentDefinition")]
    public sealed class IncidentDefinition : ScriptableObject
    {
        [System.Serializable]
        public struct IncidentBranch
        {
            public string ending;

            [TextArea]
            public string condition;
        }

        [SerializeField]
        private string incidentId = "Incident";

        [SerializeField]
        [TextArea]
        private string description = string.Empty;

        [SerializeField]
        private string[] requiredInteractables = System.Array.Empty<string>();

        [SerializeField]
        private string[] requiredArtifacts = System.Array.Empty<string>();

        public string IncidentId => incidentId;
        public string Description => description;
        public string[] RequiredInteractables => requiredInteractables;
        public string[] RequiredArtifacts => requiredArtifacts;
        [SerializeField]
        private IncidentBranch[] branches = System.Array.Empty<IncidentBranch>();

        public IReadOnlyList<IncidentBranch> Branches => branches;
    }
}
