// Assets/Scripts/MVP/WorkStation.cs
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

public class WorkStation : MonoBehaviour
{
    [SerializeField] float interactionRange = 2.5f;
    [SerializeField] string stationLabel = "work here";

    CoverWorkTracker tracker;
    Transform playerTransform;

    void Start()
    {
        tracker = FindFirstObjectByType<CoverWorkTracker>();
        var player = FindFirstObjectByType<DreamOfOne.Core.PlayerController>();
        if (player != null) playerTransform = player.transform;
    }

    void Update()
    {
        if (playerTransform == null || tracker == null) return;
        float dist = Vector3.Distance(transform.position, playerTransform.position);
        if (dist > interactionRange)
        {
            if (tracker.Logic.IsWorking) tracker.Logic.SetWorking(false);
            return;
        }

        bool pressed = false;
#if ENABLE_INPUT_SYSTEM
        pressed = Keyboard.current != null && Keyboard.current.eKey.wasPressedThisFrame;
#else
        pressed = Input.GetKeyDown(KeyCode.E);
#endif
        if (pressed && GameStateManager.CurrentState == GameState.Roaming)
            tracker.Logic.SetWorking(!tracker.Logic.IsWorking);
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.green;
        Gizmos.DrawWireSphere(transform.position, interactionRange);
    }
}
