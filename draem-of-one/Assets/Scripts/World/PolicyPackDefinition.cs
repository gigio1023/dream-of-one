using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Policy Pack", fileName = "PolicyPack")]
    public sealed class PolicyPackDefinition : ScriptableObject
    {
        [SerializeField]
        private string policyId = "Policy";

        [SerializeField]
        [TextArea]
        private string description = string.Empty;

        [Header("Society Policy Library")]
        [SerializeField]
        [Tooltip("This pack's role definitions (LLM/validator reference).")]
        private RoleDefinition[] roles = System.Array.Empty<RoleDefinition>();

        [SerializeField]
        [Tooltip("This pack's skill definitions (LLM/validator reference).")]
        private SkillDefinition[] skills = System.Array.Empty<SkillDefinition>();

        public string PolicyId => policyId;
        public string Description => description;
        public RoleDefinition[] Roles => roles;
        public SkillDefinition[] Skills => skills;
    }
}
