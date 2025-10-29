using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    [CreateAssetMenu(menuName = "DreamOfOne/DreamRuleSet")]
    public class DreamRuleSet : ScriptableObject
    {
        public List<DreamRule> rules = new List<DreamRule>();
        public int seed = 0;
    }
}


