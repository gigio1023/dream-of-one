using UnityEngine;

namespace DreamOfOne.Core
{
    [RequireComponent(typeof(Collider))]
    public sealed class ClueTrigger : MonoBehaviour
    {
        [SerializeField]
        private string clueTag = string.Empty;

        [SerializeField]
        private HypothesisTracker hypothesisTracker = null;

        private void Reset()
        {
            Collider c = GetComponent<Collider>();
            if (c != null)
            {
                c.isTrigger = true;
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player"))
            {
                return;
            }

            if (hypothesisTracker != null && !string.IsNullOrEmpty(clueTag))
            {
                hypothesisTracker.LogClue(clueTag);
            }
        }
    }
}


