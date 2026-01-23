using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Skill Definition", fileName = "SkillDefinition")]
    public sealed class SkillDefinition : ScriptableObject
    {
        [SerializeField]
        private string skillId = "Speak";

        [SerializeField]
        private string displayName = "Speak";

        [SerializeField]
        [TextArea]
        private string description = string.Empty;

        [SerializeField]
        [Tooltip("Suggested cooldown between executions for this skill (planner hint only).")]
        private float suggestedCooldownSeconds = 4f;

        [SerializeField]
        [Tooltip("Planner hint: parameters this skill may accept (e.g. ruleId, zoneId, placeId, targetId).")]
        private string[] parameterKeys = System.Array.Empty<string>();

        public string SkillId => skillId;
        public string DisplayName => displayName;
        public string Description => description;
        public float SuggestedCooldownSeconds => suggestedCooldownSeconds;
        public string[] ParameterKeys => parameterKeys;
    }
}

