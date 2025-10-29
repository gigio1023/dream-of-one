using System.Linq;
using System.Text;
using UnityEngine;
using UnityEngine.UI;

namespace DreamOfOne.Core
{
    public sealed class KnowledgeNoteView : MonoBehaviour
    {
        [SerializeField]
        private HypothesisTracker hypothesisTracker = null;

        [SerializeField]
        private Text noteText = null;

        private void LateUpdate()
        {
            if (noteText == null || hypothesisTracker == null)
            {
                return;
            }

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("[Knowledge Note]");

            foreach (string ruleId in hypothesisTracker.ConfirmedRuleIds.OrderBy(s => s))
            {
                sb.AppendLine($"• {ruleId} (확정)");
            }

            noteText.text = sb.ToString();
        }
    }
}


