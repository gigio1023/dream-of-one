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

        public string PolicyId => policyId;
        public string Description => description;
    }
}
