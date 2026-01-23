using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Ruleset Definition", fileName = "RulesetDefinition")]
    public sealed class RulesetDefinition : ScriptableObject
    {
        [SerializeField]
        private string rulesetId = "Ruleset";

        [SerializeField]
        private List<RuleDefinition> rules = new();

        public string RulesetId => rulesetId;
        public IReadOnlyList<RuleDefinition> Rules => rules;
    }
}
