using UnityEngine;

public enum GameState
{
    Roaming,
    ConversationActive,
    ConversationWaiting,
    GameOver
}

public static class GameStateManager
{
    static GameState currentState = GameState.Roaming;

    public static GameState CurrentState => currentState;

    public static void SetState(GameState newState)
    {
        if (currentState == newState) return;
        Debug.Log($"[GameStateManager] {currentState} -> {newState}");
        currentState = newState;
    }

    /// <summary>
    /// Reset to Roaming. Call on scene load / restart.
    /// </summary>
    public static void Reset()
    {
        currentState = GameState.Roaming;
        Debug.Log("[GameStateManager] Reset to Roaming");
    }
}
