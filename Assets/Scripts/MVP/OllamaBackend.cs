using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;
using System.Text;

public class OllamaBackend : MonoBehaviour, ILLMBackend
{
    [SerializeField] string endpoint = "http://localhost:11434/api/generate";
    [SerializeField] string model = "llama3.2:3b";

    public bool IsAvailable => true;

    public async Task<LLMResponse> SendAsync(string prompt)
    {
        try
        {
            var body = JsonUtility.ToJson(new OllamaRequest
            {
                model = model,
                prompt = prompt,
                stream = false
            });

            using var request = new UnityWebRequest(endpoint, "POST");
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.timeout = 30;

            var op = request.SendWebRequest();
            while (!op.isDone) await Task.Yield();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogWarning($"[Ollama] Request failed: {request.error}");
                return LLMResponse.Fallback();
            }

            var raw = request.downloadHandler.text;
            var ollamaResp = JsonUtility.FromJson<OllamaResponse>(raw);
            return ParseResponse(ollamaResp.response);
        }
        catch (System.Exception e)
        {
            Debug.LogWarning($"[Ollama] Exception: {e.Message}");
            return LLMResponse.Fallback();
        }
    }

    LLMResponse ParseResponse(string text)
    {
        // Try to extract JSON from response
        int jsonStart = text.IndexOf('{');
        int jsonEnd = text.LastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart)
        {
            try
            {
                string json = text.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var parsed = JsonUtility.FromJson<LLMResponse>(json);
                if (parsed != null && !string.IsNullOrEmpty(parsed.text))
                    return parsed;
            }
            catch { }
        }

        // Fallback: use raw text, neutral suspicion
        return new LLMResponse { text = text, suspicionDelta = 0f, success = true };
    }

    [System.Serializable]
    struct OllamaRequest
    {
        public string model;
        public string prompt;
        public bool stream;
    }

    [System.Serializable]
    struct OllamaResponse
    {
        public string response;
    }
}
