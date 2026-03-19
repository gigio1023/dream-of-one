using UnityEngine;
using UnityEngine.InputSystem;
using TMPro;

public class ConversationUI : MonoBehaviour
{
    [SerializeField] GameObject panel;
    [SerializeField] TMP_InputField inputField;
    [SerializeField] TMP_Text npcNameText;
    [SerializeField] TMP_Text dialogueText;

    NPCInteraction currentNPC;
    bool waitingForResponse;

    public bool IsActive => panel != null && panel.activeSelf;

    void Awake()
    {
        if (panel != null) panel.SetActive(false);
        Debug.Log($"[ConversationUI] Awake: panel={panel != null}, input={inputField != null}, npcName={npcNameText != null}, dialogue={dialogueText != null}");
    }

    public void Show(NPCInteraction npc, string npcName)
    {
        currentNPC = npc;

        if (panel != null)
            panel.SetActive(true);
        else
            Debug.LogError("[ConversationUI] panel is null! Cannot show conversation.");

        if (npcNameText != null)
            npcNameText.text = $"[{npcName}]";

        if (dialogueText != null)
        {
            // NPC greets first
            dialogueText.text = $"<color=#88ccff>{npcName}</color>: 어서오세요. 뭐 필요한 거 있으세요?";
        }

        if (inputField != null)
        {
            inputField.text = "";
            // Set placeholder if exists
            if (inputField.placeholder != null)
            {
                var phText = inputField.placeholder.GetComponent<TMP_Text>();
                if (phText != null) phText.text = "여기에 입력하세요... (Enter 전송, ESC 닫기)";
            }
            inputField.ActivateInputField();
            inputField.Select();
            Debug.Log("[ConversationUI] Input field activated");
        }
        else
        {
            Debug.LogError("[ConversationUI] inputField is null! Cannot type.");
        }

        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;

        GameStateManager.SetState(GameState.ConversationActive);
        Debug.Log($"[ConversationUI] Show: {npcName}, cursor unlocked");
    }

    public void Hide()
    {
        if (panel != null) panel.SetActive(false);
        currentNPC?.EndConversation();
        currentNPC = null;
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;

        GameStateManager.SetState(GameState.Roaming);
        Debug.Log("[ConversationUI] Hidden");
    }

    void Update()
    {
        if (currentNPC == null) return;

        var kb = Keyboard.current;
        if (kb == null) return;

        // ESC closes conversation only when NOT waiting for response
        if (kb.escapeKey.wasPressedThisFrame && !waitingForResponse)
        {
            Hide();
            return;
        }

        // Enter submits only when ConversationActive (not waiting)
        if (kb.enterKey.wasPressedThisFrame && !waitingForResponse)
        {
            string msg = inputField?.text?.Trim();
            if (!string.IsNullOrEmpty(msg))
            {
                Debug.Log($"[ConversationUI] Submitting: '{msg}'");
                SubmitMessage(msg);
            }
        }
    }

    async void SubmitMessage(string message)
    {
        waitingForResponse = true;
        GameStateManager.SetState(GameState.ConversationWaiting);

        // Show player message
        if (dialogueText != null)
            dialogueText.text += $"\n<color=#88ff88>나</color>: {message}";

        // Clear input
        if (inputField != null) inputField.text = "";

        // Show "thinking" indicator
        if (dialogueText != null && currentNPC != null)
            dialogueText.text += $"\n<color=#888888>({currentNPC.NpcRole} 생각 중...)</color>";

        // Get LLM response
        string response = currentNPC != null
            ? await currentNPC.ProcessPlayerMessage(message)
            : null;

        // Null check on currentNPC after await (conversation may have been closed)
        if (currentNPC == null)
        {
            waitingForResponse = false;
            return;
        }

        // Remove "thinking" and show response
        if (dialogueText != null)
        {
            string text = dialogueText.text;
            int thinkIdx = text.LastIndexOf("\n<color=#888888>");
            if (thinkIdx >= 0)
                text = text.Substring(0, thinkIdx);
            dialogueText.text = text + $"\n<color=#88ccff>{currentNPC.NpcRole}</color>: {response}";
        }

        waitingForResponse = false;
        GameStateManager.SetState(GameState.ConversationActive);

        if (inputField != null)
        {
            inputField.ActivateInputField();
            inputField.Select();
        }
    }
}
