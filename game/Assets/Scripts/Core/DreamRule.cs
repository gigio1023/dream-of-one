using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    public enum RuleCategory
    {
        Etiquette,
        Movement,
        Time,
        Language,
        Object,
        Ritual
    }

    [CreateAssetMenu(menuName = "DreamOfOne/DreamRule")]
    public class DreamRule : ScriptableObject
    {
        public string id = string.Empty;
        public RuleCategory category = RuleCategory.Etiquette;
        [TextArea]
        public string statement = string.Empty;
        public List<string> conditions = new List<string>();
        public List<string> violation = new List<string>();
        public List<string> clues = new List<string>();
        [Range(0, 100)]
        public int suspicionDelta = 0;
        public string hintDensity = "med";
    }
}


