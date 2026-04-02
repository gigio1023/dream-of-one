using System.Threading.Tasks;

public interface ILLMBackend
{
    Task<LLMResponse> SendAsync(string prompt);
    bool IsAvailable { get; }
}

[System.Serializable]
public class LLMResponse
{
    public string text;
    public float suspicionDelta;
    public bool success;

    public static LLMResponse Fallback()
    {
        return new LLMResponse
        {
            text = "...흠, 수상하군.",
            suspicionDelta = 5f,
            success = false
        };
    }
}
