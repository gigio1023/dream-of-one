using UnityEngine;

namespace DreamOfOne.Core
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField]
        private float moveSpeedMetersPerSecond = 4.5f;

        [SerializeField]
        private float gravityMetersPerSecond = -9.81f;

        private CharacterController characterController = null;
        private Vector3 velocity = Vector3.zero;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
        }

        private void Update()
        {
            float h = Input.GetAxisRaw("Horizontal");
            float v = Input.GetAxisRaw("Vertical");
            Vector3 input = new Vector3(h, 0f, v);
            input = Vector3.ClampMagnitude(input, 1f);

            Vector3 move = transform.TransformDirection(input) * moveSpeedMetersPerSecond;

            if (characterController.isGrounded)
            {
                velocity.y = 0f;
            }
            velocity.y += gravityMetersPerSecond * Time.deltaTime;

            characterController.Move((move + velocity) * Time.deltaTime);
        }
    }
}


