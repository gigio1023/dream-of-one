using System.Diagnostics;
using System.Threading.Tasks;
using UnityEngine;

public class CodexExecBackend : MonoBehaviour, ILLMBackend
{
    [SerializeField] string model = "gpt-5.4-mini";
    [SerializeField] string reasoningEffort = "low";
    [SerializeField] float timeoutSeconds = 30f;

    string codexPath;

    public bool IsAvailable => !string.IsNullOrEmpty(codexPath);

    void Awake()
    {
        // Find codex binary
        codexPath = "/opt/homebrew/bin/codex";
        if (!System.IO.File.Exists(codexPath))
        {
            // Try which
            try
            {
                var which = new Process();
                which.StartInfo.FileName = "which";
                which.StartInfo.Arguments = "codex";
                which.StartInfo.RedirectStandardOutput = true;
                which.StartInfo.UseShellExecute = false;
                which.Start();
                codexPath = which.StandardOutput.ReadToEnd().Trim();
                which.WaitForExit();
            }
            catch { codexPath = ""; }
        }

        if (IsAvailable)
            UnityEngine.Debug.Log($"[CodexExec] Found codex at {codexPath}, model={model}");
        else
            UnityEngine.Debug.LogWarning("[CodexExec] codex CLI not found, will use fallback responses");
    }

    public async Task<LLMResponse> SendAsync(string prompt)
    {
        if (!IsAvailable)
            return LLMResponse.Fallback();

        try
        {
            var result = await RunCodexExec(prompt);
            return ParseResponse(result);
        }
        catch (System.Exception e)
        {
            UnityEngine.Debug.LogWarning($"[CodexExec] Error: {e.Message}");
            return LLMResponse.Fallback();
        }
    }

    Task<string> RunCodexExec(string prompt)
    {
        var tcs = new TaskCompletionSource<string>();

        var process = new Process();
        process.StartInfo.FileName = codexPath;
        process.StartInfo.Arguments = $"exec -m \"{model}\" -c reasoning.effort=\"{reasoningEffort}\" --sandbox read-only --ephemeral -o /dev/stdout \"{EscapeForShell(prompt)}\"";
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.UseShellExecute = false;
        process.StartInfo.CreateNoWindow = true;

        var output = new System.Text.StringBuilder();

        process.OutputDataReceived += (sender, args) =>
        {
            if (args.Data != null)
                output.AppendLine(args.Data);
        };

        process.EnableRaisingEvents = true;
        process.Exited += (sender, args) =>
        {
            tcs.TrySetResult(output.ToString().Trim());
            process.Dispose();
        };

        // Timeout
        Task.Delay((int)(timeoutSeconds * 1000)).ContinueWith(_ =>
        {
            if (!tcs.Task.IsCompleted)
            {
                try { process.Kill(); } catch { }
                tcs.TrySetResult("");
            }
        });

        process.Start();
        process.BeginOutputReadLine();

        return tcs.Task;
    }

    LLMResponse ParseResponse(string text)
    {
        if (string.IsNullOrEmpty(text))
            return LLMResponse.Fallback();

        // Find JSON in output
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

        // Fallback: use raw text
        return new LLMResponse { text = text, suspicionDelta = 0f, success = true };
    }

    static string EscapeForShell(string input)
    {
        return input.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("$", "\\$").Replace("`", "\\`");
    }
}
