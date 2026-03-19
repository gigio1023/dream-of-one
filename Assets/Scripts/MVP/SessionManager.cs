using UnityEngine;
using DreamOfOne.Core;

public class SessionManager : MonoBehaviour
{
    [SerializeField] float sessionDurationSeconds = 300f; // 5 minutes
    [SerializeField] GlobalSuspicionSystem globalSuspicion;
    [SerializeField] ExposureSystem exposureSystem;

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
    }

    void Update()
    {
        if (gameOver) return;

        elapsed += Time.deltaTime;

        // Lose: exposure maxed
        if (exposureSystem != null && CheckLoseCondition(exposureSystem.Exposure))
        {
            EndGame("LOSE — 정체가 발각되었습니다.");
            return;
        }

        // Win: survived
        if (elapsed >= sessionDurationSeconds)
        {
            EndGame("WIN — 무사히 하루를 보냈습니다.");
        }
    }

    void EndGame(string msg)
    {
        gameOver = true;
        result = msg;
        Time.timeScale = 0f;
        Debug.Log($"[Session] {msg}");
    }

    public void Restart()
    {
        Time.timeScale = 1f;
        elapsed = 0f;
        gameOver = false;
        result = "";
    }
}
