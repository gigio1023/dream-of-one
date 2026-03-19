using UnityEngine;
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
    }

    public void Show(NPCInteraction npc, string npcName)
    {
        currentNPC = npc;
        if (panel != null) panel.SetActive(true);
        if (npcNameText != null) npcNameText.text = npcName;
        if (dialogueText != null) dialogueText.text = "";
        if (inputField != null)
        {
            inputField.text = "";
            inputField.ActivateInputField();
        }
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }

    public void Hide()
    {
        if (panel != null) panel.SetActive(false);
        currentNPC?.EndConversation();
        currentNPC = null;
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    void Update()
    {
        if (currentNPC == null) return;

        // ESC to close
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            Hide();
            return;
        }

        // Enter to send
        if (Input.GetKeyDown(KeyCode.Return) && !waitingForResponse)
        {
            string msg = inputField?.text?.Trim();
            if (!string.IsNullOrEmpty(msg))
                SubmitMessage(msg);
        }
    }

    async void SubmitMessage(string message)
    {
        waitingForResponse = true;
        if (dialogueText != null)
            dialogueText.text += $"\n<color=#88ff88>나: {message}</color>";
        if (inputField != null) inputField.text = "";

        string response = await currentNPC.ProcessPlayerMessage(message);

        if (dialogueText != null)
            dialogueText.text += $"\n{currentNPC.name}: {response}";

        waitingForResponse = false;
        if (inputField != null) inputField.ActivateInputField();
    }
}
