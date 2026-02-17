using System.Collections.Generic;

namespace DreamOfOne.Core
{
    public sealed class FallbackDialogueProvider : IDialogueProvider
    {
        public DialogueResult GetResponse(string playerUtterance, IReadOnlyList<DreamRule> confirmedRules)
        {
            // Keep short, neutral responses and very small suspicion changes
            string utterance = "좋은 하루예요.";
            string hintTag = string.Empty;
            int deltaSuspicion = 0;

            if (!string.IsNullOrWhiteSpace(playerUtterance))
            {
                // Extremely small randomization-free behavior to avoid nondeterminism
                if (playerUtterance.Contains("안녕") || playerUtterance.Contains("hello") || playerUtterance.Contains("hi"))
                {
                    utterance = "인사는 짧게 해요.";
                }
            }

            return new DialogueResult(utterance, hintTag, deltaSuspicion);
        }
    }
}


