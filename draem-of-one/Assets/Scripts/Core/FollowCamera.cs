using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DreamOfOne.Core
{
    /// <summary>
    /// 3인칭 추적 카메라. GTA 스타일의 뒤 시점 + 궤도 회전/줌/스냅을 제공한다.
    /// </summary>
    public sealed class FollowCamera : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("추적할 대상. 일반적으로 Player Transform.")]
        private Transform target = null;

        [SerializeField]
        [Tooltip("카메라 높이(대상 기준)")]
        private float height = 2.2f;

        [SerializeField]
        [Tooltip("카메라 거리(대상 기준)")]
        private float distance = 4.5f;

        [SerializeField]
        [Tooltip("좌우 어깨 오프셋")]
        private Vector3 shoulderOffset = new(0.45f, 0f, 0f);

        [SerializeField]
        [Tooltip("거리 최소/최대")]
        private Vector2 distanceRange = new(2.5f, 8f);

        [SerializeField]
        [Tooltip("피치 제한(도)")]
        private Vector2 pitchRange = new(-5f, 40f);

        [SerializeField]
        [Tooltip("위치 보간 속도")]
        private float followSpeed = 5f;

        [SerializeField]
        [Tooltip("회전 보간 속도(도/초)")]
        private float rotateSpeed = 180f;

        [SerializeField]
        [Tooltip("마우스 회전 감도")]
        private float orbitSpeed = 140f;

        [SerializeField]
        [Tooltip("키보드 회전 감도(도/초)")]
        private float keyboardOrbitSpeed = 90f;

        [SerializeField]
        [Tooltip("줌 감도")]
        private float zoomSpeed = 2f;

        [SerializeField]
        [Tooltip("우클릭 시에만 카메라 회전")]
        private bool requireRightMouse = true;

        [SerializeField]
        [Tooltip("화살표 키로도 시점 회전 허용")]
        private bool allowArrowKeys = true;

        [SerializeField]
        [Tooltip("뒤로 스냅 키")]
        private KeyCode snapKey = KeyCode.R;

        [SerializeField]
        [Tooltip("카메라 모드 안내 표시")]
        private bool showPrompt = true;

        [SerializeField]
        private float[] distancePresets = new[] { 3.5f, 5f, 7f };

        private float yaw = 0f;
        private float pitch = 15f;
        private DreamOfOne.UI.UIManager uiManager = null;
        private Camera cachedCamera = null;

        private void LateUpdate()
        {
            if (target == null)
            {
                var player = GameObject.FindGameObjectWithTag("Player");
                if (player != null)
                {
                    target = player.transform;
                }
            }

            if (target == null)
            {
                return;
            }

            EnsureCamera();
            HandleInput();

            Vector3 targetPos = target.position + Vector3.up * height;
            Quaternion orbit = Quaternion.Euler(pitch, yaw, 0f);
            Vector3 desiredPosition = targetPos + orbit * shoulderOffset - orbit * Vector3.forward * distance;
            transform.position = Vector3.Lerp(transform.position, desiredPosition, followSpeed * Time.deltaTime);

            Quaternion desiredRotation = Quaternion.LookRotation(targetPos - transform.position, Vector3.up);
            transform.rotation = Quaternion.RotateTowards(transform.rotation, desiredRotation, rotateSpeed * Time.deltaTime);

            if (showPrompt)
            {
                uiManager ??= UnityEngine.Object.FindFirstObjectByType<DreamOfOne.UI.UIManager>();
                uiManager?.ShowPrompt("RMB:회전  휠:줌  R:뒤로");
            }
        }

        public void Configure(Transform followTarget)
        {
            target = followTarget;
        }

        private void HandleInput()
        {
#if ENABLE_INPUT_SYSTEM
            HandleInputNew();
#else
            HandleInputUnavailable();
#endif
        }

#if ENABLE_INPUT_SYSTEM
        private void HandleInputNew()
        {
            if (WasKeyDown(snapKey) && target != null)
            {
                yaw = target.eulerAngles.y;
            }

            if (WasKeyDown(KeyCode.Alpha1))
            {
                SetDistancePreset(0);
            }
            else if (WasKeyDown(KeyCode.Alpha2))
            {
                SetDistancePreset(1);
            }
            else if (WasKeyDown(KeyCode.Alpha3))
            {
                SetDistancePreset(2);
            }

            float scroll = Mouse.current != null ? Mouse.current.scroll.ReadValue().y * 0.01f : 0f;
            if (Mathf.Abs(scroll) > 0.001f)
            {
                distance = Mathf.Clamp(distance - scroll * zoomSpeed, distanceRange.x, distanceRange.y);
            }

            bool orbitInput = !requireRightMouse || (Mouse.current != null && Mouse.current.rightButton.isPressed);
            if (orbitInput && Mouse.current != null)
            {
                Vector2 delta = Mouse.current.delta.ReadValue();
                const float deltaScale = 0.05f;
                yaw += delta.x * orbitSpeed * deltaScale;
                pitch -= delta.y * orbitSpeed * deltaScale;
            }

            if (allowArrowKeys && Keyboard.current != null)
            {
                Vector2 arrow = Vector2.zero;
                if (Keyboard.current.leftArrowKey.isPressed) arrow.x -= 1f;
                if (Keyboard.current.rightArrowKey.isPressed) arrow.x += 1f;
                if (Keyboard.current.upArrowKey.isPressed) arrow.y += 1f;
                if (Keyboard.current.downArrowKey.isPressed) arrow.y -= 1f;

                if (arrow.sqrMagnitude > 0f)
                {
                    yaw += arrow.x * keyboardOrbitSpeed * Time.deltaTime;
                    pitch -= arrow.y * keyboardOrbitSpeed * Time.deltaTime;
                }
            }

            pitch = Mathf.Clamp(pitch, pitchRange.x, pitchRange.y);
        }

        private static bool WasKeyDown(KeyCode code)
        {
            if (Keyboard.current == null)
            {
                return false;
            }

            Key key = code switch
            {
                KeyCode.V => Key.V,
                KeyCode.R => Key.R,
                KeyCode.Alpha1 => Key.Digit1,
                KeyCode.Alpha2 => Key.Digit2,
                KeyCode.Alpha3 => Key.Digit3,
                _ => Key.None
            };

            if (key == Key.None)
            {
                return false;
            }

            return Keyboard.current[key].wasPressedThisFrame;
        }
#else
        private static bool inputUnavailableLogged = false;

        private void HandleInputUnavailable()
        {
            if (inputUnavailableLogged)
            {
                return;
            }

            inputUnavailableLogged = true;
            Debug.LogWarning("[FollowCamera] No input system available. Enable Input System or Legacy Input Manager.");
        }
#endif

        private void SetDistancePreset(int index)
        {
            if (distancePresets == null || index < 0 || index >= distancePresets.Length)
            {
                return;
            }

            distance = Mathf.Clamp(distancePresets[index], distanceRange.x, distanceRange.y);
        }

        private void EnsureCamera()
        {
            if (cachedCamera == null)
            {
                cachedCamera = GetComponent<Camera>();
            }

            if (cachedCamera == null)
            {
                return;
            }

            cachedCamera.orthographic = false;
            cachedCamera.fieldOfView = 60f;
        }
    }
}
