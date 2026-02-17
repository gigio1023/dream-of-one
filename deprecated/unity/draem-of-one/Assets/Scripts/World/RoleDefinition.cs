using DreamOfOne.Core;
using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Role Definition", fileName = "RoleDefinition")]
    public sealed class RoleDefinition : ScriptableObject
    {
        [SerializeField]
        private string roleId = "Citizen";

        [SerializeField]
        private RoleId roleIdEnum = RoleId.None;

        [SerializeField]
        private string organizationId = "None";

        [SerializeField]
        private OrganizationId organizationIdEnum = OrganizationId.None;

        [SerializeField]
        [TextArea]
        private string description = string.Empty;

        [SerializeField]
        [Tooltip("Skill IDs that this role is allowed to execute.")]
        private string[] allowedSkillIds = System.Array.Empty<string>();

        public RoleId RoleId => roleIdEnum != RoleId.None ? roleIdEnum : IdentifierUtility.ParseRoleId(roleId);
        public OrganizationId OrganizationId => organizationIdEnum != OrganizationId.None
            ? organizationIdEnum
            : IdentifierUtility.ParseOrganizationId(organizationId);
        public string RoleIdRaw => roleId;
        public string OrganizationIdRaw => organizationId;
        public string Description => description;
        public string[] AllowedSkillIds => allowedSkillIds;
    }
}
