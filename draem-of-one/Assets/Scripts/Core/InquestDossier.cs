using System.Collections.Generic;

namespace DreamOfOne.Core
{
    public sealed class InquestDossier
    {
        public string dossierId = string.Empty;
        public string suspectId = "PLAYER";
        public string topic = string.Empty;
        public string placeId = string.Empty;
        public string zoneId = string.Empty;

        public CaseBundle CaseBundle { get; set; }

        public int Exposure { get; set; }
        public float GlobalSuspicion { get; set; }
        public int EvidenceCount { get; set; }
        public int DefenseCount { get; set; }
        public int SeveritySum { get; set; }
        public int Score { get; set; }
        public InquestVerdict Verdict { get; set; }

        public List<string> Reasons { get; } = new();
    }
}
