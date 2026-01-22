using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

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
        [Tooltip("이동 방향으로 회전할지 여부(고정 시점 유지용)")]
        private bool rotateToMove = false;

        [SerializeField]
        [Tooltip("카메라 기준 이동을 계산할 기준 Transform")]
        private Transform cameraPivot = null;

        [SerializeField]
        [Tooltip("입력 이벤트를 기록할 WorldEventLog")]
        private WorldEventLog eventLog = null;

        [SerializeField]
        [Tooltip("현재 상호작용 가능한 Zone")]
        private ZoneInteractable currentInteractable = null;

        [SerializeField]
        [Tooltip("촬영 시 사용할 규칙 ID")]
        private string photoRuleId = "R10";

#if ENABLE_INPUT_SYSTEM
        [SerializeField]
        [Tooltip("이동 입력 액션")]
        private InputActionReference moveAction = null;

        [SerializeField]
        [Tooltip("상호작용 입력 액션")]
        private InputActionReference interactAction = null;

        [SerializeField]
        [Tooltip("촬영 입력 액션")]
        private InputActionReference photoAction = null;
#endif

        private CharacterController characterController = null;
        private float verticalVelocity = 0.0f;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (cameraPivot == null && Camera.main != null)
            {
                cameraPivot = Camera.main.transform;
            }
        }

        private void OnEnable()
        {
#if ENABLE_INPUT_SYSTEM
            moveAction?.action.Enable();
            interactAction?.action.Enable();
            photoAction?.action.Enable();
#endif
            ZoneInteractable.OnPlayerEntered += HandleZoneEnter;
            ZoneInteractable.OnPlayerExited += HandleZoneExit;
        }

        private void OnDisable()
        {
#if ENABLE_INPUT_SYSTEM
            moveAction?.action.Disable();
            interactAction?.action.Disable();
            photoAction?.action.Disable();
#endif
            ZoneInteractable.OnPlayerEntered -= HandleZoneEnter;
            ZoneInteractable.OnPlayerExited -= HandleZoneExit;
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
            Vector2 input = ReadMoveInput();
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

            if (rotateToMove && move.sqrMagnitude > 0.1f)
            {
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(move), 10f * Time.deltaTime);
            }
        }

        /// <summary>
        /// E/F 입력을 감지해 이벤트를 찍어 두고 이후 규칙 처리 로직을 연결한다.
        /// </summary>
        private void HandleInteraction()
        {
            if (WasInteractPressed())
            {
                currentInteractable?.TryInteract("Player", "Player");
            }

            if (WasPhotoPressed())
            {
                RecordPhotoEvent();
            }
        }

        /// <summary>
        /// 실제 규칙 구현 전까지는 단순히 이벤트 로그에 기록만 해 둔다.
        /// </summary>
        private void RecordPhotoEvent()
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
                category = EventCategory.Rule,
                ruleId = photoRuleId,
                severity = 2,
                note = "photo_attempt",
                position = transform.position,
                topic = photoRuleId
            };

            eventLog.RecordEvent(record);
        }

        private Vector2 ReadMoveInput()
        {
#if ENABLE_INPUT_SYSTEM
            if (moveAction != null)
            {
                return moveAction.action.ReadValue<Vector2>();
            }

            if (Keyboard.current == null)
            {
                return Vector2.zero;
            }

            Vector2 input = Vector2.zero;
            if (Keyboard.current.wKey.isPressed) input.y += 1f;
            if (Keyboard.current.sKey.isPressed) input.y -= 1f;
            if (Keyboard.current.aKey.isPressed) input.x -= 1f;
            if (Keyboard.current.dKey.isPressed) input.x += 1f;
            return input;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return new Vector2(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"));
#else
            LogInputUnavailable();
            return Vector2.zero;
#endif
        }

        private bool WasInteractPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (interactAction != null)
            {
                return interactAction.action.WasPerformedThisFrame();
            }

            return Keyboard.current != null && Keyboard.current.eKey.wasPressedThisFrame;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetKeyDown(KeyCode.E);
#else
            LogInputUnavailable();
            return false;
#endif
        }

        private bool WasPhotoPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (photoAction != null)
            {
                return photoAction.action.WasPerformedThisFrame();
            }

            return Keyboard.current != null && Keyboard.current.fKey.wasPressedThisFrame;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetKeyDown(KeyCode.F);
#else
            LogInputUnavailable();
            return false;
#endif
        }

#if !ENABLE_INPUT_SYSTEM && !ENABLE_LEGACY_INPUT_MANAGER
        private static bool inputUnavailableLogged = false;

        private static void LogInputUnavailable()
        {
            if (inputUnavailableLogged)
            {
                return;
            }

            inputUnavailableLogged = true;
            Debug.LogWarning("[PlayerController] No input system available. Enable Input System or Legacy Input Manager.");
        }
#endif

        private void HandleZoneEnter(ZoneInteractable interactable)
        {
            currentInteractable = interactable;
        }

        private void HandleZoneExit(ZoneInteractable interactable)
        {
            if (currentInteractable == interactable)
            {
                currentInteractable = null;
            }
        }

        public void Configure(WorldEventLog log, Transform cameraRoot)
        {
            eventLog = log;
            cameraPivot = cameraRoot;
        }
    }
}
