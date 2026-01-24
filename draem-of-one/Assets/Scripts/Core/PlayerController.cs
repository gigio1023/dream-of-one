using DreamOfOne.UI;
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
        [Tooltip("점프 높이")]
        private float jumpHeight = 1.2f;

        [SerializeField]
        [Tooltip("지면에 붙일 때 사용할 수직 속도")]
        private float groundedSnapVelocity = -1f;

        [SerializeField]
        [Tooltip("CharacterController StepOffset")]
        private float controllerStepOffset = 0.3f;

        [SerializeField]
        [Tooltip("CharacterController SlopeLimit")]
        private float controllerSlopeLimit = 45f;

        [SerializeField]
        [Tooltip("CharacterController SkinWidth")]
        private float controllerSkinWidth = 0.08f;

        [SerializeField]
        [Tooltip("CharacterController MinMoveDistance")]
        private float controllerMinMoveDistance = 0.001f;

        [SerializeField]
        [Tooltip("벽 끼임 감지용 입력 임계값")]
        private float stuckInputThreshold = 0.2f;

        [SerializeField]
        [Tooltip("벽 끼임 감지용 속도 임계값")]
        private float stuckVelocityThreshold = 0.05f;

        [SerializeField]
        [Tooltip("벽 끼임 복구까지의 대기 시간")]
        private float stuckRecoveryDelay = 0.5f;

        [SerializeField]
        [Tooltip("벽 끼임 복구 시 위로 올리는 높이")]
        private float stuckRecoveryLift = 0.05f;

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
        [Tooltip("현재 상호작용 가능한 오브젝트")]
        private IInteractable currentInteractable = null;

        [SerializeField]
        [Tooltip("상호작용 탐색 거리")]
        private float interactionRange = 2.2f;

        [SerializeField]
        [Tooltip("상호작용 탐색 레이어 마스크")]
        private LayerMask interactionMask = ~0;

        [SerializeField]
        [Tooltip("카메라가 없을 때 사용하는 레이캐스트 시작 오프셋")]
        private Vector3 fallbackRayOffset = new Vector3(0f, 1.5f, 0f);

        [SerializeField]
        [Tooltip("상호작용 프롬프트 표시용 UIManager")]
        private UIManager uiManager = null;

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

        [SerializeField]
        [Tooltip("점프 입력 액션")]
        private InputActionReference jumpAction = null;
#endif

        private CharacterController characterController = null;
        private float verticalVelocity = 0.0f;
        private Vector3 lastStablePosition = Vector3.zero;
        private float stuckTimer = 0f;

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

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }

            lastStablePosition = transform.position;
            CharacterControllerTuning.Apply(characterController, new CharacterControllerTuning.Settings
            {
                StepOffset = controllerStepOffset,
                SlopeLimit = controllerSlopeLimit,
                SkinWidth = controllerSkinWidth,
                MinMoveDistance = controllerMinMoveDistance
            });

            var grounding = GetComponent<ActorGrounding>();
            if (grounding == null)
            {
                grounding = gameObject.AddComponent<ActorGrounding>();
            }

            grounding.Apply();

#if ENABLE_INPUT_SYSTEM
            if (GetComponent<PlayerInputBootstrapper>() == null)
            {
                gameObject.AddComponent<PlayerInputBootstrapper>();
            }
#endif
        }

        private void OnEnable()
        {
#if ENABLE_INPUT_SYSTEM
            moveAction?.action.Enable();
            interactAction?.action.Enable();
            photoAction?.action.Enable();
            jumpAction?.action.Enable();
#endif
        }

        private void OnDisable()
        {
#if ENABLE_INPUT_SYSTEM
            moveAction?.action.Disable();
            interactAction?.action.Disable();
            photoAction?.action.Disable();
            jumpAction?.action.Disable();
#endif
        }

        private void Update()
        {
            HandleMovement();
            UpdateInteractionFocus();
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

            float inputMagnitude = move.magnitude;
            verticalVelocity = PlayerVerticalMotion.UpdateVerticalVelocity(
                verticalVelocity,
                characterController.isGrounded,
                WasJumpPressed(),
                gravity,
                jumpHeight,
                Time.deltaTime,
                groundedSnapVelocity);

            Vector3 velocity = move * moveSpeed + Vector3.up * verticalVelocity;
            characterController.Move(velocity * Time.deltaTime);

            UpdateStuckRecovery(inputMagnitude);

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
                var context = new InteractContext("Player", "Player", transform.position);
                if (currentInteractable != null && currentInteractable.CanInteract(context))
                {
                    currentInteractable.Interact(context);
                }
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

        private void UpdateInteractionFocus()
        {
            if (uiManager == null)
            {
                return;
            }

            var context = new InteractContext("Player", "Player", transform.position);
            var focused = FindInteractable(context, out string prompt);

            if (focused != null && focused.CanInteract(context))
            {
                currentInteractable = focused;
                if (!string.IsNullOrEmpty(prompt))
                {
                    uiManager.ShowPrompt(prompt);
                }
                else
                {
                    uiManager.HidePrompt();
                }
                return;
            }

            currentInteractable = null;
            uiManager.HidePrompt();
        }

        private IInteractable FindInteractable(InteractContext context, out string prompt)
        {
            prompt = string.Empty;

            Vector3 origin = cameraPivot != null ? cameraPivot.position : transform.position + fallbackRayOffset;
            Vector3 direction = cameraPivot != null ? cameraPivot.forward : transform.forward;

            if (Physics.Raycast(origin, direction, out var hit, interactionRange, interactionMask, QueryTriggerInteraction.Collide))
            {
                var interactable = ResolveInteractable(hit.collider);
                if (interactable != null)
                {
                    prompt = interactable.GetPrompt(context);
                }
                return interactable;
            }

            return null;
        }

        private static IInteractable ResolveInteractable(Collider collider)
        {
            if (collider == null)
            {
                return null;
            }

            var behaviours = collider.GetComponentsInParent<MonoBehaviour>();
            for (int i = 0; i < behaviours.Length; i++)
            {
                if (behaviours[i] is IInteractable interactable)
                {
                    return interactable;
                }
            }

            return null;
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
#else
            Vector2 input = Vector2.zero;
            if (Input.GetKey(KeyCode.W)) input.y += 1f;
            if (Input.GetKey(KeyCode.S)) input.y -= 1f;
            if (Input.GetKey(KeyCode.A)) input.x -= 1f;
            if (Input.GetKey(KeyCode.D)) input.x += 1f;
            return input;
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
#else
            return Input.GetKeyDown(KeyCode.E);
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
#else
            return Input.GetKeyDown(KeyCode.F);
#endif
        }

        private bool WasJumpPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (jumpAction != null)
            {
                return jumpAction.action.WasPerformedThisFrame();
            }

            return Keyboard.current != null && Keyboard.current.spaceKey.wasPressedThisFrame;
#else
            return Input.GetKeyDown(KeyCode.Space);
#endif
        }

        private void HandleZoneEnter(ZoneInteractable interactable)
        {
            currentInteractable = interactable;
        }

        private void HandleZoneExit(ZoneInteractable interactable)
        {
            if (ReferenceEquals(currentInteractable, interactable))
            {
                currentInteractable = null;
            }
        }

        public void Configure(WorldEventLog log, Transform cameraRoot)
        {
            eventLog = log;
            cameraPivot = cameraRoot;
        }

#if ENABLE_INPUT_SYSTEM
        public void BindInputActions(InputAction move, InputAction interact, InputAction photo, InputAction jump)
        {
            moveAction = move != null ? InputActionReference.Create(move) : null;
            interactAction = interact != null ? InputActionReference.Create(interact) : null;
            photoAction = photo != null ? InputActionReference.Create(photo) : null;
            jumpAction = jump != null ? InputActionReference.Create(jump) : null;
        }
#endif

        private void UpdateStuckRecovery(float inputMagnitude)
        {
            float speed = characterController.velocity.magnitude;
            bool hasSideCollision = (characterController.collisionFlags & CollisionFlags.Sides) != 0;

            if (characterController.isGrounded && (!hasSideCollision || speed > stuckVelocityThreshold))
            {
                lastStablePosition = transform.position;
            }

            stuckTimer = PlayerStuckRecovery.UpdateStuckTimer(
                stuckTimer,
                inputMagnitude,
                speed,
                hasSideCollision,
                Time.deltaTime,
                stuckInputThreshold,
                stuckVelocityThreshold);

            if (PlayerStuckRecovery.ShouldRecover(
                stuckTimer,
                stuckRecoveryDelay,
                inputMagnitude,
                speed,
                hasSideCollision,
                stuckInputThreshold,
                stuckVelocityThreshold))
            {
                RecoverToLastStablePosition();
            }
        }

        private void RecoverToLastStablePosition()
        {
            stuckTimer = 0f;
            if (characterController == null)
            {
                return;
            }

            characterController.enabled = false;
            transform.position = lastStablePosition + Vector3.up * stuckRecoveryLift;
            characterController.enabled = true;
        }
    }
}
