using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class DirectorController : MonoBehaviour
    {
        [SerializeField]
        private float minClueIntervalSeconds = 180f; // 3 minutes

        private float timeSinceLastClue = 0f;

        private void Update()
        {
            timeSinceLastClue += Time.deltaTime;
            if (timeSinceLastClue >= minClueIntervalSeconds)
            {
                TriggerClueEvent();
                timeSinceLastClue = 0f;
            }
        }

        private void TriggerClueEvent()
        {
            // Placeholder: later tie into level scripting to reveal a clue
            Debug.Log("Director: Triggered a clue event for pacing");
        }
    }
}


