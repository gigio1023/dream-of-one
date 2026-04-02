using System;
using UnityEngine;

public enum DramaAct { Peace, Tension, Resolution }

public class DramaManagerLogic
{
    readonly float actOneEnd;
    readonly float actTwoEnd;
    readonly float sessionEnd;
    float elapsed;
    DramaAct currentAct = DramaAct.Peace;

    public DramaAct CurrentAct => currentAct;
    public float Elapsed => elapsed;
    public float SessionEnd => sessionEnd;
    public event Action<DramaAct> OnActChanged;

    public float ActProgress
    {
        get
        {
            float actStart = currentAct switch
            {
                DramaAct.Peace => 0f,
                DramaAct.Tension => actOneEnd,
                DramaAct.Resolution => actTwoEnd,
                _ => 0f
            };
            float actEnd = currentAct switch
            {
                DramaAct.Peace => actOneEnd,
                DramaAct.Tension => actTwoEnd,
                DramaAct.Resolution => sessionEnd,
                _ => 1f
            };
            return Mathf.Clamp01((elapsed - actStart) / (actEnd - actStart));
        }
    }

    public DramaManagerLogic(float actOneEnd, float actTwoEnd, float sessionEnd)
    {
        this.actOneEnd = actOneEnd;
        this.actTwoEnd = actTwoEnd;
        this.sessionEnd = sessionEnd;
    }

    public void Tick(float totalElapsed)
    {
        elapsed = totalElapsed;
        DramaAct newAct;
        if (elapsed < actOneEnd) newAct = DramaAct.Peace;
        else if (elapsed < actTwoEnd) newAct = DramaAct.Tension;
        else newAct = DramaAct.Resolution;

        if (newAct != currentAct)
        {
            currentAct = newAct;
            OnActChanged?.Invoke(currentAct);
        }
    }

    public string GetToneDirective()
    {
        return currentAct switch
        {
            DramaAct.Peace => "[TONE: casual, friendly. Greet the player warmly. Stick to small talk.]",
            DramaAct.Tension => "[TONE: suspicious, probing. Mention odd things you noticed. Ask pointed questions.]",
            DramaAct.Resolution => "[TONE: confrontational or relieved depending on suspicion. Be direct.]",
            _ => ""
        };
    }
}

public class DramaManagerMB : MonoBehaviour
{
    [SerializeField] float actOneEndSeconds = 180f;
    [SerializeField] float actTwoEndSeconds = 480f;
    [SerializeField] float sessionEndSeconds = 720f;

    DramaManagerLogic logic;
    float startTime;
    public DramaManagerLogic Logic => logic;

    void Awake()
    {
        logic = new DramaManagerLogic(actOneEndSeconds, actTwoEndSeconds, sessionEndSeconds);
    }

    void Start() { startTime = Time.time; }

    void Update()
    {
        if (GameStateManager.CurrentState == GameState.GameOver) return;
        logic.Tick(Time.time - startTime);
    }
}
