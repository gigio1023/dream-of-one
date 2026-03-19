using UnityEngine;

public class SimpleFPSCamera : MonoBehaviour
{
    [SerializeField] float mouseSensitivity = 2f;
    [SerializeField] float maxLookAngle = 80f;

    float rotationX;
    Transform playerBody;

    void Start()
    {
        playerBody = transform.parent;
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    void Update()
    {
        // Skip ESC handling if ConversationUI is active
        var conversation = FindFirstObjectByType<ConversationUI>();
        if (conversation != null && conversation.IsActive) return;

        // ESC to unlock cursor (for conversation UI)
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            Cursor.lockState = Cursor.lockState == CursorLockMode.Locked
                ? CursorLockMode.None
                : CursorLockMode.Locked;
            Cursor.visible = Cursor.lockState != CursorLockMode.Locked;
        }

        if (Cursor.lockState != CursorLockMode.Locked) return;

        float mouseX = Input.GetAxis("Mouse X") * mouseSensitivity;
        float mouseY = Input.GetAxis("Mouse Y") * mouseSensitivity;

        // Horizontal rotation — rotate player body
        if (playerBody != null)
            playerBody.Rotate(Vector3.up * mouseX);

        // Vertical rotation — rotate camera only
        rotationX -= mouseY;
        rotationX = Mathf.Clamp(rotationX, -maxLookAngle, maxLookAngle);
        transform.localRotation = Quaternion.Euler(rotationX, 0f, 0f);
    }
}
