// Assets/Scripts/MVP/ResultScreenUI.cs
using UnityEngine;
using TMPro;

public class ResultScreenUI : MonoBehaviour
{
    [SerializeField] GameObject panel;
    [SerializeField] TextMeshProUGUI titleText;
    [SerializeField] TextMeshProUGUI bodyText;

    void Awake()
    {
        if (panel != null) panel.SetActive(false);
    }

    public void ShowSurvived(float elapsedTime)
    {
        titleText.text = "무사히 하루를 마침";
        bodyText.text = $"근무 시간: {FormatTime(elapsedTime)}\n의심 없이 통과했습니다.";
        panel.SetActive(true);
        GameStateManager.SetState(GameState.GameOver);
    }

    public void ShowExposed(float elapsedTime, float suspicion)
    {
        titleText.text = "정체가 발각됨";
        bodyText.text = $"근무 시간: {FormatTime(elapsedTime)}\n최종 의심도: {suspicion:P0}";
        panel.SetActive(true);
        GameStateManager.SetState(GameState.GameOver);
    }

    string FormatTime(float seconds)
    {
        int min = Mathf.FloorToInt(seconds / 60f);
        int sec = Mathf.FloorToInt(seconds % 60f);
        return $"{min}분 {sec}초";
    }
}
