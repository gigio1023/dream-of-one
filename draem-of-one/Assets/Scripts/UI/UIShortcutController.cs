using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DreamOfOne.UI
{
    public sealed class UIShortcutController : MonoBehaviour
    {
        [SerializeField]
        private UIManager uiManager = null;

#if ENABLE_INPUT_SYSTEM
        [SerializeField]
        private InputActionReference toggleLogAction = null;

        [SerializeField]
        private InputActionReference toggleArtifactAction = null;

        [SerializeField]
        private InputActionReference toggleDebugAction = null;

        [SerializeField]
        private InputActionReference toggleCaseAction = null;
#endif

        [SerializeField]
        private KeyCode toggleLogKey = KeyCode.L;

        [SerializeField]
        private KeyCode toggleArtifactKey = KeyCode.I;

        [SerializeField]
        private KeyCode toggleDebugKey = KeyCode.F1;

        [SerializeField]
        private KeyCode toggleCaseKey = KeyCode.C;

        private void Awake()
        {
            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }
        }

        private void OnEnable()
        {
#if ENABLE_INPUT_SYSTEM
            toggleLogAction?.action.Enable();
            toggleArtifactAction?.action.Enable();
            toggleDebugAction?.action.Enable();
            toggleCaseAction?.action.Enable();
#endif
        }

        private void OnDisable()
        {
#if ENABLE_INPUT_SYSTEM
            toggleLogAction?.action.Disable();
            toggleArtifactAction?.action.Disable();
            toggleDebugAction?.action.Disable();
            toggleCaseAction?.action.Disable();
#endif
        }

        private void Update()
        {
            if (uiManager == null)
            {
                return;
            }

            if (WasToggleLogPressed())
            {
                uiManager.ToggleLogPanel();
            }

            if (WasToggleArtifactPressed())
            {
                uiManager.InspectNextArtifact();
            }

            if (WasToggleDebugPressed())
            {
                uiManager.ToggleDevOverlay();
            }

            if (WasToggleCasePressed())
            {
                uiManager.ToggleCasePanel();
            }
        }

        private bool WasToggleLogPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (toggleLogAction != null)
            {
                return toggleLogAction.action.WasPerformedThisFrame();
            }

            return IsKeyPressed(toggleLogKey);
#else
            return false;
#endif
        }

        private bool WasToggleArtifactPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (toggleArtifactAction != null)
            {
                return toggleArtifactAction.action.WasPerformedThisFrame();
            }

            return IsKeyPressed(toggleArtifactKey);
#else
            return false;
#endif
        }

        private bool WasToggleDebugPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (toggleDebugAction != null)
            {
                return toggleDebugAction.action.WasPerformedThisFrame();
            }

            return IsKeyPressed(toggleDebugKey);
#else
            return false;
#endif
        }

        private bool WasToggleCasePressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (toggleCaseAction != null)
            {
                return toggleCaseAction.action.WasPerformedThisFrame();
            }

            return IsKeyPressed(toggleCaseKey);
#else
            return false;
#endif
        }

#if ENABLE_INPUT_SYSTEM
        private static bool IsKeyPressed(KeyCode code)
        {
            if (Keyboard.current == null)
            {
                return false;
            }

            Key key = code switch
            {
                KeyCode.L => Key.L,
                KeyCode.I => Key.I,
                KeyCode.F1 => Key.F1,
                KeyCode.C => Key.C,
                _ => Key.None
            };

            if (key == Key.None)
            {
                return false;
            }

            return Keyboard.current[key].wasPressedThisFrame;
        }
#endif

#if ENABLE_INPUT_SYSTEM
        public void BindInputActions(InputAction toggleLog, InputAction toggleArtifact, InputAction toggleDebug, InputAction toggleCase)
        {
            toggleLogAction = toggleLog != null ? InputActionReference.Create(toggleLog) : null;
            toggleArtifactAction = toggleArtifact != null ? InputActionReference.Create(toggleArtifact) : null;
            toggleDebugAction = toggleDebug != null ? InputActionReference.Create(toggleDebug) : null;
            toggleCaseAction = toggleCase != null ? InputActionReference.Create(toggleCase) : null;
        }
#endif
    }
}
