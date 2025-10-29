using System.Collections.Generic;

namespace DreamOfOne.Core
{
    public interface IDialogueProvider
    {
        DialogueResult GetResponse(string playerUtterance, IReadOnlyList<DreamRule> confirmedRules);
    }
}


