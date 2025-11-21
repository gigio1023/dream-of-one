using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// WASD 이동과 간단한 상호작용 입력을 담당하는 플레이어 컨트롤러.
    /// 초기에 이동만 확보해도 Zone, NavMesh 테스트가 가능하도록 단순하게 유지한다.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("평면 이동 속도")]
        private float moveSpeed = 4.0f;

        [SerializeField]
        [Tooltip("중력 값. Unity 기본 중력과 동일하게 사용.")]
        private float gravity = -9.81f;

        [SerializeField]
        [Tooltip("카메라 기준 이동을 계산할 기준 Transform")]
        private Transform cameraPivot = null;

        [SerializeField]
        [Tooltip("입력 이벤트를 기록할 WorldEventLog")]
        private WorldEventLog eventLog = null;

        private CharacterController characterController = null;
        private float verticalVelocity = 0.0f;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
        }

        private void Update()
        {
            HandleMovement();
            HandleInteraction();
        }

        /// <summary>
        /// CharacterController를 이용해 평면 이동과 중력을 처리한다.
        /// </summary>
        private void HandleMovement()
        {
            Vector2 input = new(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"));
            Vector3 move = new(input.x, 0f, input.y);

            if (cameraPivot != null)
            {
                Vector3 forward = cameraPivot.forward;
                forward.y = 0f;
                forward.Normalize();

                Vector3 right = cameraPivot.right;
                right.y = 0f;
                right.Normalize();

                move = forward * input.y + right * input.x;
            }

            if (move.sqrMagnitude > 1f)
            {
                move.Normalize();
            }

            verticalVelocity += gravity * Time.deltaTime;
            if (characterController.isGrounded && verticalVelocity < 0f)
            {
                verticalVelocity = -1f;
            }

            Vector3 velocity = move * moveSpeed + Vector3.up * verticalVelocity;
            characterController.Move(velocity * Time.deltaTime);

            if (move.sqrMagnitude > 0.1f)
            {
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(move), 10f * Time.deltaTime);
            }
        }

        /// <summary>
        /// E/F 입력을 감지해 이벤트를 찍어 두고 이후 규칙 처리 로직을 연결한다.
        /// </summary>
        private void HandleInteraction()
        {
            if (Input.GetKeyDown(KeyCode.E))
            {
                RecordPlayerEvent("interaction_generic");
            }

            if (Input.GetKeyDown(KeyCode.F))
            {
                RecordPlayerEvent("photo_attempt");
            }
        }

        /// <summary>
        /// 실제 규칙 구현 전까지는 단순히 이벤트 로그에 기록만 해 둔다.
        /// </summary>
        private void RecordPlayerEvent(string note)
        {
            if (eventLog == null)
            {
                return;
            }

            var record = new EventRecord
            {
                actorId = "Player",
                actorRole = "Player",
                eventType = EventType.ViolationDetected,
                ruleId = note,
                note = note
            };

            eventLog.RecordEvent(record);
        }
    }
}


