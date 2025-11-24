using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class HypothesisTracker : MonoBehaviour
    {
        [SerializeField]
        private int confirmationsRequired = 3;

        private readonly Dictionary<string, int> clueCountByRuleId = new Dictionary<string, int>();
        private readonly HashSet<string> confirmedRuleIds = new HashSet<string>();

        public IReadOnlyCollection<string> ConfirmedRuleIds => confirmedRuleIds;

        public void LogClue(string ruleId)
        {
            if (string.IsNullOrEmpty(ruleId) || confirmedRuleIds.Contains(ruleId))
            {
                return;
            }

            if (!clueCountByRuleId.TryGetValue(ruleId, out int current))
            {
                current = 0;
            }

            current++;
            clueCountByRuleId[ruleId] = current;

            if (current >= confirmationsRequired)
            {
                confirmedRuleIds.Add(ruleId);
                Debug.Log($"Rule confirmed: {ruleId}");
            }
        }
    }
}


