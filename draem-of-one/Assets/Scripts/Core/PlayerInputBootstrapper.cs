using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DreamOfOne.Core
{
    public sealed class PlayerInputBootstrapper : MonoBehaviour
    {
#if ENABLE_INPUT_SYSTEM
        [SerializeField]
        private PlayerController playerController = null;

        [SerializeField]
        private DreamOfOne.UI.UIShortcutController uiShortcuts = null;

        private PlayerInput playerInput = null;

        private void Awake()
        {
            playerController = playerController ?? GetComponent<PlayerController>();
            uiShortcuts = uiShortcuts ?? FindFirstObjectByType<DreamOfOne.UI.UIShortcutController>();
            playerInput = GetComponent<PlayerInput>();
            if (playerInput == null)
            {
                playerInput = gameObject.AddComponent<PlayerInput>();
            }

            var asset = ScriptableObject.CreateInstance<InputActionAsset>();
            var map = new InputActionMap("Player");

            var move = map.AddAction("Move", InputActionType.Value);
            move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/w")
                .With("Down", "<Keyboard>/s")
                .With("Left", "<Keyboard>/a")
                .With("Right", "<Keyboard>/d");
            move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/upArrow")
                .With("Down", "<Keyboard>/downArrow")
                .With("Left", "<Keyboard>/leftArrow")
                .With("Right", "<Keyboard>/rightArrow");
            move.AddBinding("<Gamepad>/leftStick");

            var look = map.AddAction("Look", InputActionType.Value);
            look.AddBinding("<Mouse>/delta");
            look.AddBinding("<Gamepad>/rightStick");

            var interact = map.AddAction("Interact", InputActionType.Button);
            interact.AddBinding("<Keyboard>/e");

            var photo = map.AddAction("Photo", InputActionType.Button);
            photo.AddBinding("<Keyboard>/f");

            var jump = map.AddAction("Jump", InputActionType.Button);
            jump.AddBinding("<Keyboard>/space");

            var openLog = map.AddAction("OpenLog", InputActionType.Button);
            openLog.AddBinding("<Keyboard>/l");

            var inspect = map.AddAction("InspectArtifact", InputActionType.Button);
            inspect.AddBinding("<Keyboard>/i");

            var debug = map.AddAction("DebugToggle", InputActionType.Button);
            debug.AddBinding("<Keyboard>/f1");

            var toggleCase = map.AddAction("ToggleCase", InputActionType.Button);
            toggleCase.AddBinding("<Keyboard>/c");

            asset.AddActionMap(map);
            map.Enable();

            playerInput.actions = asset;
            playerInput.defaultActionMap = "Player";

            playerController?.BindInputActions(move, interact, photo, jump);
            uiShortcuts?.BindInputActions(openLog, inspect, debug, toggleCase);
        }
#endif
    }
}
