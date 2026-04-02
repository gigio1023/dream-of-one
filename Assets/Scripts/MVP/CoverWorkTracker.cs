// Assets/Scripts/MVP/CoverWorkTracker.cs
using UnityEngine;

public class CoverWorkLogic
{
    readonly float bonusDecay;
    readonly float idlePenalty;
    public bool IsWorking { get; private set; }

    public CoverWorkLogic(float bonusDecay, float idlePenalty)
    {
        this.bonusDecay = bonusDecay;
        this.idlePenalty = idlePenalty;
    }

    public void SetWorking(bool working) => IsWorking = working;
    public float GetSuspicionModifier() => IsWorking ? bonusDecay : idlePenalty;
}

public class CoverWorkTracker : MonoBehaviour
{
    [SerializeField] float bonusDecayPerSecond = -0.5f;
    [SerializeField] float idlePenaltyPerSecond = 0.2f;

    CoverWorkLogic logic;
    public CoverWorkLogic Logic => logic;

    void Awake()
    {
        logic = new CoverWorkLogic(bonusDecayPerSecond, idlePenaltyPerSecond);
    }

    void Update()
    {
        if (GameStateManager.CurrentState != GameState.Roaming) return;
        float mod = logic.GetSuspicionModifier() * Time.deltaTime;
        if (Mathf.Approximately(mod, 0f)) return;
        var npcs = FindObjectsByType<DreamOfOne.NPC.SuspicionComponent>(FindObjectsSortMode.None);
        foreach (var npc in npcs)
            npc.AddSuspicion(mod, logic.IsWorking ? "cover_work" : "idle_wander", "");
    }
}
