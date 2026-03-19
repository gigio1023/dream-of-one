using UnityEngine;
using UnityEngine.InputSystem;

public class SimpleFPSCamera : MonoBehaviour
{
    [SerializeField] float mouseSensitivity = 2f;
    [SerializeField] float maxLookAngle = 80f;

    float rotationX;
    Transform playerBody;
    Mouse mouse;
    Keyboard keyboard;

    void Start()
    {
        playerBody = transform.parent;
        mouse = Mouse.current;
        keyboard = Keyboard.current;
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
        Debug.Log($"[SimpleFPSCamera] Started. Parent={playerBody?.name}");
    }

    void Update()
    {
        if (mouse == null || keyboard == null) return;

        // Block camera when not roaming
        if (GameStateManager.CurrentState != GameState.Roaming)
            return;

        // ESC to toggle cursor lock (only when Roaming)
        if (keyboard.escapeKey.wasPressedThisFrame)
        {
            bool wasLocked = Cursor.lockState == CursorLockMode.Locked;
            Cursor.lockState = wasLocked ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = wasLocked;
        }

        // Click to re-lock cursor
        if (Cursor.lockState != CursorLockMode.Locked)
        {
            if (mouse.leftButton.wasPressedThisFrame)
            {
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
            }
            return;
        }

        Vector2 delta = mouse.delta.ReadValue() * mouseSensitivity * 0.1f;

        // Horizontal rotation — rotate player body
        if (playerBody != null)
            playerBody.Rotate(Vector3.up * delta.x);

        // Vertical rotation — rotate camera only
        rotationX -= delta.y;
        rotationX = Mathf.Clamp(rotationX, -maxLookAngle, maxLookAngle);
        transform.localRotation = Quaternion.Euler(rotationX, 0f, 0f);
    }
}
