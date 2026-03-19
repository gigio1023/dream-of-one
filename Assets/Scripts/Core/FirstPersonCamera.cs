using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DreamOfOne.Core
{
    /// <summary>
    /// Prototype에서 1인칭 카메라를 제공한다.
    /// Player를 추적하면서 머리 높이에서 yaw/pitch 회전을 적용한다.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    [DefaultExecutionOrder(-150)]
    public sealed class FirstPersonCamera : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("추적할 대상. 비어있으면 Player 태그를 자동 탐색한다.")]
        private Transform target = null;

        [SerializeField]
        [Tooltip("CharacterController 상단에서 눈 위치를 얼마나 내릴지(월드 단위)")]
        private float eyeClearance = 0.12f;

        [SerializeField]
        [Tooltip("눈 위치를 추가로 올리는 오프셋(월드 단위). 0이면 보정하지 않는다.")]
        private float eyeHeightOffset = 0f;

        [SerializeField]
        [Tooltip("CharacterController를 찾지 못했을 때 사용할 카메라 오프셋(월드 단위)")]
        private Vector3 fallbackOffset = new(0f, 1.6f, 0f);

        [SerializeField]
        [Tooltip("Input System 사용 시 마우스 감도(도/픽셀)")]
        private float mouseSensitivity = 0.12f;

#if !ENABLE_INPUT_SYSTEM
        [SerializeField]
        [Tooltip("레거시 Input 사용 시 마우스 시점 회전 감도")]
        private float lookSpeed = 140f;
#endif

        [SerializeField]
        [Tooltip("키보드(화살표) 시점 회전 감도(도/초)")]
        private float keyboardLookSpeed = 90f;

        [SerializeField]
        [Tooltip("피치 제한(도)")]
        private Vector2 pitchRange = new(-80f, 80f);

        [SerializeField]
        [Tooltip("RMB를 누른 동안만 시점 회전")]
        private bool requireRightMouse = false;

        [SerializeField]
        [Tooltip("시점 회전 중 커서를 잠그고 숨길지 여부")]
        private bool lockCursorWhileLooking = true;

        [SerializeField]
        [Tooltip("시점 회전이 항상 활성일 때(Esc로 토글) 커서 잠금/해제를 허용")]
        private bool allowCursorToggle = true;

        [SerializeField]
        [Tooltip("커서 잠금/해제 토글 키")]
        private KeyCode cursorToggleKey = KeyCode.Escape;

        [SerializeField]
        [Tooltip("화살표 키로도 시점 회전을 허용")]
        private bool allowArrowKeys = true;

        [SerializeField]
        [Tooltip("시점 리셋 키")]
        private KeyCode resetKey = KeyCode.R;

        [SerializeField]
        [Tooltip("1인칭에서 플레이어 렌더러를 숨길지 여부")]
        private bool hideTargetRenderers = true;

        [SerializeField]
        [Tooltip("카메라 Near Clip을 이 값 이하로 낮춘다(0이면 변경 안 함)")]
        private float nearClipOverride = 0.05f;

        [SerializeField]
        [Tooltip("카메라 yaw를 플레이어(y축) 회전에 동기화")]
        private bool syncTargetYaw = true;

        private readonly List<(Renderer renderer, bool enabled)> rendererStates = new();
        private Camera cachedCamera = null;
        private CharacterController cachedController = null;
        private bool renderersHidden = false;
        private bool cursorLocked = false;
        private bool cursorCaptureEnabled = true;

        private float yaw = 0f;
        private float pitch = 0f;
        private bool initialized = false;

        private void Update()
        {
            EnsureTarget();
            if (target == null)
            {
                SetCursorLocked(false);
                return;
            }

            InitializeOrientationIfNeeded();

            UpdateCursorCapture();

            bool lookActive = IsLookActive();
            if (lockCursorWhileLooking)
            {
                SetCursorLocked(lookActive);
            }

            if (lookActive)
            {
                ApplyLookInput();
            }
            else if (allowArrowKeys && cursorCaptureEnabled)
            {
                ApplyKeyboardLook();
            }

            pitch = Mathf.Clamp(pitch, pitchRange.x, pitchRange.y);

            if (WasResetPressed())
            {
                yaw = target.eulerAngles.y;
                pitch = 0f;
            }

            transform.rotation = Quaternion.Euler(pitch, yaw, 0f);

            if (syncTargetYaw)
            {
                target.rotation = Quaternion.Euler(0f, yaw, 0f);
            }
        }

        private void Awake()
        {
            cachedCamera = GetComponent<Camera>();
            cachedCamera.orthographic = false;
            if (nearClipOverride > 0f)
            {
                cachedCamera.nearClipPlane = Mathf.Min(cachedCamera.nearClipPlane, nearClipOverride);
            }

            EnsureTarget();
            InitializeOrientationIfNeeded();
            cursorCaptureEnabled = true;
        }

        private void OnDisable()
        {
            RestoreTargetRenderers();
            SetCursorLocked(false);
        }

        private void LateUpdate()
        {
            EnsureTarget();
            if (target == null)
            {
                return;
            }

            transform.position = ComputeEyePosition();
        }

        private void EnsureTarget()
        {
            if (target == null)
            {
                var player = GameObject.FindGameObjectWithTag("Player");
                if (player != null)
                {
                    target = player.transform;
                }
            }

            if (target != null && cachedController == null)
            {
                cachedController = target.GetComponent<CharacterController>();
            }

            if (target != null && hideTargetRenderers && !renderersHidden)
            {
                HideTargetRenderers();
            }
        }

        private void InitializeOrientationIfNeeded()
        {
            if (initialized || target == null)
            {
                return;
            }

            yaw = target.eulerAngles.y;
            pitch = 0f;
            initialized = true;
        }

        private Vector3 ComputeEyePosition()
        {
            if (target == null)
            {
                return transform.position;
            }

            if (cachedController == null)
            {
                return target.position + fallbackOffset + Vector3.up * eyeHeightOffset;
            }

            Vector3 centerWorld = target.TransformPoint(cachedController.center);
            float heightWorld = cachedController.height * Mathf.Abs(target.lossyScale.y);
            Vector3 topWorld = centerWorld + Vector3.up * (heightWorld * 0.5f);
            Vector3 eye = topWorld - Vector3.up * Mathf.Max(0f, eyeClearance);
            return eye + Vector3.up * eyeHeightOffset;
        }

        private bool IsLookActive()
        {
            if (!cursorCaptureEnabled && lockCursorWhileLooking)
            {
                return false;
            }

            if (!requireRightMouse)
            {
                return true;
            }

#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null && Mouse.current.rightButton.isPressed;
#else
            return Input.GetMouseButton(1);
#endif
        }

        private void ApplyLookInput()
        {
#if ENABLE_INPUT_SYSTEM
            if (Mouse.current == null)
            {
                return;
            }

            Vector2 delta = Mouse.current.delta.ReadValue();
            yaw += delta.x * mouseSensitivity;
            pitch -= delta.y * mouseSensitivity;
#else
            float deltaX = Input.GetAxisRaw("Mouse X");
            float deltaY = Input.GetAxisRaw("Mouse Y");
            yaw += deltaX * lookSpeed;
            pitch -= deltaY * lookSpeed;
#endif
        }

        private void ApplyKeyboardLook()
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current == null)
            {
                return;
            }

            Vector2 arrow = Vector2.zero;
            if (Keyboard.current.leftArrowKey.isPressed) arrow.x -= 1f;
            if (Keyboard.current.rightArrowKey.isPressed) arrow.x += 1f;
            if (Keyboard.current.upArrowKey.isPressed) arrow.y += 1f;
            if (Keyboard.current.downArrowKey.isPressed) arrow.y -= 1f;

            if (arrow.sqrMagnitude <= 0f)
            {
                return;
            }

            yaw += arrow.x * keyboardLookSpeed * Time.deltaTime;
            pitch -= arrow.y * keyboardLookSpeed * Time.deltaTime;
#else
            float arrowX = 0f;
            float arrowY = 0f;
            if (Input.GetKey(KeyCode.LeftArrow)) arrowX -= 1f;
            if (Input.GetKey(KeyCode.RightArrow)) arrowX += 1f;
            if (Input.GetKey(KeyCode.UpArrow)) arrowY += 1f;
            if (Input.GetKey(KeyCode.DownArrow)) arrowY -= 1f;

            if (Mathf.Abs(arrowX) <= 0f && Mathf.Abs(arrowY) <= 0f)
            {
                return;
            }

            yaw += arrowX * keyboardLookSpeed * Time.deltaTime;
            pitch -= arrowY * keyboardLookSpeed * Time.deltaTime;
#endif
        }

        private void UpdateCursorCapture()
        {
            if (!lockCursorWhileLooking || !allowCursorToggle)
            {
                cursorCaptureEnabled = true;
                return;
            }

            if (WasCursorTogglePressed())
            {
                cursorCaptureEnabled = !cursorCaptureEnabled;
            }

            if (cursorCaptureEnabled)
            {
                return;
            }

#if ENABLE_INPUT_SYSTEM
            if (Mouse.current != null && (Mouse.current.leftButton.wasPressedThisFrame || Mouse.current.rightButton.wasPressedThisFrame))
            {
                if (!IsPointerOverUI())
                {
                    cursorCaptureEnabled = true;
                }
            }
#else
            if (Input.GetMouseButtonDown(0) || Input.GetMouseButtonDown(1))
            {
                if (!IsPointerOverUI())
                {
                    cursorCaptureEnabled = true;
                }
            }
#endif
        }

        private static bool IsPointerOverUI()
        {
            return EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
        }

        private bool WasResetPressed()
        {
#if ENABLE_INPUT_SYSTEM
            return WasKeyPressedThisFrame(resetKey);
#else
            return Input.GetKeyDown(resetKey);
#endif
        }

        private bool WasCursorTogglePressed()
        {
            if (!lockCursorWhileLooking || !allowCursorToggle)
            {
                return false;
            }

#if ENABLE_INPUT_SYSTEM
            return WasKeyPressedThisFrame(cursorToggleKey);
#else
            return Input.GetKeyDown(cursorToggleKey);
#endif
        }

#if ENABLE_INPUT_SYSTEM
        private static bool WasKeyPressedThisFrame(KeyCode keyCode)
        {
            if (Keyboard.current == null)
            {
                return false;
            }

            if (!TryMapKeyCodeToInputSystemKey(keyCode, out Key key))
            {
                return false;
            }

            return Keyboard.current[key].wasPressedThisFrame;
        }

        private static bool TryMapKeyCodeToInputSystemKey(KeyCode keyCode, out Key key)
        {
            key = default;
            if (keyCode == KeyCode.None)
            {
                return false;
            }

            if (keyCode >= KeyCode.A && keyCode <= KeyCode.Z)
            {
                key = (Key)((int)Key.A + (keyCode - KeyCode.A));
                return true;
            }

            if (keyCode >= KeyCode.Alpha0 && keyCode <= KeyCode.Alpha9)
            {
                int digit = keyCode - KeyCode.Alpha0;
                key = (Key)((int)Key.Digit0 + digit);
                return true;
            }

            if (keyCode >= KeyCode.F1 && keyCode <= KeyCode.F12)
            {
                int offset = keyCode - KeyCode.F1;
                key = (Key)((int)Key.F1 + offset);
                return true;
            }

            switch (keyCode)
            {
                case KeyCode.Escape:
                    key = Key.Escape;
                    return true;
                case KeyCode.Space:
                    key = Key.Space;
                    return true;
                case KeyCode.Tab:
                    key = Key.Tab;
                    return true;
                case KeyCode.Return:
                    key = Key.Enter;
                    return true;
                case KeyCode.Backspace:
                    key = Key.Backspace;
                    return true;
                case KeyCode.BackQuote:
                    key = Key.Backquote;
                    return true;
                case KeyCode.LeftShift:
                    key = Key.LeftShift;
                    return true;
                case KeyCode.RightShift:
                    key = Key.RightShift;
                    return true;
                case KeyCode.LeftAlt:
                    key = Key.LeftAlt;
                    return true;
                case KeyCode.RightAlt:
                    key = Key.RightAlt;
                    return true;
                case KeyCode.LeftControl:
                    key = Key.LeftCtrl;
                    return true;
                case KeyCode.RightControl:
                    key = Key.RightCtrl;
                    return true;
                case KeyCode.UpArrow:
                    key = Key.UpArrow;
                    return true;
                case KeyCode.DownArrow:
                    key = Key.DownArrow;
                    return true;
                case KeyCode.LeftArrow:
                    key = Key.LeftArrow;
                    return true;
                case KeyCode.RightArrow:
                    key = Key.RightArrow;
                    return true;
            }

            return false;
        }
#endif

        private void SetCursorLocked(bool locked)
        {
            if (!lockCursorWhileLooking)
            {
                return;
            }

            if (cursorLocked == locked)
            {
                return;
            }

            cursorLocked = locked;
            Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible = !locked;
        }

        private void HideTargetRenderers()
        {
            if (target == null)
            {
                return;
            }

            rendererStates.Clear();
            foreach (var renderer in target.GetComponentsInChildren<Renderer>(true))
            {
                if (renderer == null)
                {
                    continue;
                }

                rendererStates.Add((renderer, renderer.enabled));
                renderer.enabled = false;
            }

            renderersHidden = true;
        }

        private void RestoreTargetRenderers()
        {
            if (!renderersHidden)
            {
                return;
            }

            for (int i = 0; i < rendererStates.Count; i++)
            {
                var entry = rendererStates[i];
                if (entry.renderer != null)
                {
                    entry.renderer.enabled = entry.enabled;
                }
            }

            rendererStates.Clear();
            renderersHidden = false;
        }
    }
}
