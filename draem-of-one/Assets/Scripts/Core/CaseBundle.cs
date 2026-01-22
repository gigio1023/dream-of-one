using System.Collections.Generic;

namespace DreamOfOne.Core
{
    public sealed class CaseBundle
    {
        public string caseId = string.Empty;
        public string topic = string.Empty;
        public string placeId = string.Empty;
        public string zoneId = string.Empty;

        public readonly List<EventRecord> reports = new();
        public readonly List<EventRecord> violations = new();
        public readonly List<EventRecord> evidence = new();
        public readonly List<EventRecord> procedures = new();
        public readonly List<EventRecord> gossip = new();

        public int Score { get; private set; }

        public void RecalculateScore()
        {
            int score = 0;
            score += reports.Count * 2;
            score += violations.Count;
            score += evidence.Count * 3;
            score += procedures.Count > 0 ? 1 : 0;
            score -= gossip.Count == 0 ? 0 : 0;
            Score = score;
        }
    }
}
