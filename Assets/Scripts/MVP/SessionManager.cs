using System.Collections;
using UnityEngine;
using DreamOfOne.Core;

public class SessionManager : MonoBehaviour
{
    [SerializeField] float sessionDurationSeconds = 300f; // 5 minutes
    [SerializeField] GlobalSuspicionSystem globalSuspicion;
    [SerializeField] ExposureSystem exposureSystem;
    [SerializeField] ResultScreenUI resultScreen;

    DramaManagerMB dramaManager;
    float elapsed;
    bool gameOver;
    string result;

    public float RemainingTime => Mathf.Max(0, sessionDurationSeconds - elapsed);
    public float RemainingTimeNormalized => RemainingTime / sessionDurationSeconds;
    public bool IsGameOver => gameOver;
    public string Result => result;

    public static bool CheckLoseCondition(int exposure) => exposure >= 100;

    void Start()
    {
        if (exposureSystem == null) exposureSystem = FindFirstObjectByType<ExposureSystem>();
        if (globalSuspicion == null) globalSuspicion = FindFirstObjectByType<GlobalSuspicionSystem>();

        dramaManager = FindFirstObjectByType<DramaManagerMB>();
        if (dramaManager != null && dramaManager.Logic != null)
        {
            dramaManager.Logic.OnActChanged += OnActChanged;
        }
    }

    void OnDestroy()
    {
        if (dramaManager != null && dramaManager.Logic != null)
        {
            dramaManager.Logic.OnActChanged -= OnActChanged;
        }
    }

    void OnActChanged(DramaAct act)
    {
        if (act == DramaAct.Resolution && !gameOver)
        {
            StartCoroutine(ResolveSession());
        }
    }

    IEnumerator ResolveSession()
    {
        // Wait until the session timer expires or exposure maxes out
        while (!gameOver && elapsed < sessionDurationSeconds)
        {
            yield return null;
        }

        // If game already ended via Update (exposure), do nothing
        if (gameOver) yield break;

        // Timer expired during Resolution act -- survived
        float suspicion = globalSuspicion != null ? globalSuspicion.GlobalSuspicion : 0f;
        if (resultScreen != null)
        {
            resultScreen.ShowSurvived(elapsed);
        }
        EndGame("WIN — 무사히 하루를 보냈습니다.");
    }

    void Update()
    {
        if (gameOver) return;

        elapsed += Time.deltaTime;

        // Lose: exposure maxed
        if (exposureSystem != null && CheckLoseCondition(exposureSystem.Exposure))
        {
            float suspicion = globalSuspicion != null ? globalSuspicion.GlobalSuspicion : 0f;
            if (resultScreen != null)
            {
                resultScreen.ShowExposed(elapsed, suspicion);
            }
            EndGame("LOSE — 정체가 발각되었습니다.");
            return;
        }

        // Win: survived (fallback if no DramaManager)
        if (elapsed >= sessionDurationSeconds)
        {
            if (resultScreen != null)
            {
                resultScreen.ShowSurvived(elapsed);
            }
            EndGame("WIN — 무사히 하루를 보냈습니다.");
        }
    }

    void EndGame(string msg)
    {
        gameOver = true;
        result = msg;
        Time.timeScale = 0f;
        // Only set GameOver if ResultScreen didn't already set it
        if (GameStateManager.CurrentState != GameState.GameOver)
        {
            GameStateManager.SetState(GameState.GameOver);
        }
        Debug.Log($"[Session] {msg}");
    }

    public void Restart()
    {
        Time.timeScale = 1f;
        elapsed = 0f;
        gameOver = false;
        result = "";
        GameStateManager.Reset();
    }
}
