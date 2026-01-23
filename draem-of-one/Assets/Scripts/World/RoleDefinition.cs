using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Role Definition", fileName = "RoleDefinition")]
    public sealed class RoleDefinition : ScriptableObject
    {
        [SerializeField]
        private string roleId = "Citizen";

        [SerializeField]
        private string organizationId = "None";

        [SerializeField]
        [TextArea]
        private string description = string.Empty;

        [SerializeField]
        [Tooltip("Skill IDs that this role is allowed to execute.")]
        private string[] allowedSkillIds = System.Array.Empty<string>();

        public string RoleId => roleId;
        public string OrganizationId => organizationId;
        public string Description => description;
        public string[] AllowedSkillIds => allowedSkillIds;
    }
}

