using System;

namespace DreamOfOne.Society
{
    [Serializable]
    public sealed class SocietyActionPlan
    {
        public string intent = string.Empty;
        public string speak = string.Empty;
        public SocietyAction[] actions = Array.Empty<SocietyAction>();
        public string memoryWrite = string.Empty;
    }

    [Serializable]
    public sealed class SocietyAction
    {
        public string type = string.Empty;
        public string targetId = string.Empty;
        public string placeId = string.Empty;
        public string zoneId = string.Empty;
        public string ruleId = string.Empty;
        public string text = string.Empty;
        public string anchorName = string.Empty;
    }
}

