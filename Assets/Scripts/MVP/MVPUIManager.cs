using UnityEngine;
using UnityEngine.UI;
using TMPro;
using DreamOfOne.Core;

public class MVPUIManager : MonoBehaviour
{
    [Header("Suspicion")]
    [SerializeField] Slider suspicionBar;
    [SerializeField] TMP_Text suspicionLabel;

    [Header("Session")]
    [SerializeField] TMP_Text timerText;
    [SerializeField] TMP_Text resultText;
    [SerializeField] GameObject resultPanel;

    [Header("Toast")]
    [SerializeField] TMP_Text toastText;
    float toastTimer;

    [Header("Interaction")]
    [SerializeField] TMP_Text interactionPrompt;

    GlobalSuspicionSystem gss;
    SessionManager session;

    void Start()
    {
        gss = FindFirstObjectByType<GlobalSuspicionSystem>();
        session = FindFirstObjectByType<SessionManager>();
        if (resultPanel != null) resultPanel.SetActive(false);
    }

    void Update()
    {
        // Suspicion bar
        if (gss != null && suspicionBar != null)
        {
            suspicionBar.value = gss.GlobalSuspicion;
            if (suspicionLabel != null)
                suspicionLabel.text = $"의심도: {(gss.GlobalSuspicion * 100):F0}%";
        }

        // Timer
        if (session != null && timerText != null)
        {
            float t = session.RemainingTime;
            int min = (int)(t / 60);
            int sec = (int)(t % 60);
            timerText.text = $"{min:D2}:{sec:D2}";
        }

        // Game over
        if (session != null && session.IsGameOver)
        {
            if (resultPanel != null) resultPanel.SetActive(true);
            if (resultText != null) resultText.text = session.Result;
        }

        // Toast fade
        if (toastTimer > 0)
        {
            toastTimer -= Time.deltaTime;
            if (toastTimer <= 0 && toastText != null)
                toastText.text = "";
        }

        // Interaction prompt
        UpdateInteractionPrompt();
    }

    void UpdateInteractionPrompt()
    {
        if (interactionPrompt == null) return;

        var npcs = FindObjectsByType<NPCInteraction>(FindObjectsSortMode.None);
        foreach (var npc in npcs)
        {
            if (npc.IsInRange && !npc.IsInConversation)
            {
                interactionPrompt.text = $"[E] {npc.name}와 대화";
                return;
            }
        }
        interactionPrompt.text = "";
    }

    public void ShowToast(string msg, float duration = 3f)
    {
        if (toastText != null) toastText.text = msg;
        toastTimer = duration;
    }
}
