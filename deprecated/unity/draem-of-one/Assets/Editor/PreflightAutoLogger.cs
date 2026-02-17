#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    [InitializeOnLoad]
    public static class PreflightAutoLogger
    {
        private const string SessionKey = "DreamOfOne.PreflightAutoLogged";

        static PreflightAutoLogger()
        {
            EditorApplication.delayCall += RunOncePerSession;
        }

        private static void RunOncePerSession()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                return;
            }

            if (SessionState.GetBool(SessionKey, false))
            {
                return;
            }

            SessionState.SetBool(SessionKey, true);

            var results = PreflightValidator.Run(false);
            WriteLog(results);
        }

        private static void WriteLog(PreflightValidator.PreflightResults results)
        {
            string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", ".."));
            string logDir = Path.Combine(projectRoot, "logs");
            Directory.CreateDirectory(logDir);

            string logPath = Path.Combine(logDir, "preflight-auto.log");
            using var writer = new StreamWriter(logPath, false);
            writer.WriteLine("[PreflightAuto] Results");

            if (results.errors != null)
            {
                foreach (var error in results.errors)
                {
                    writer.WriteLine($"ERROR: {error}");
                }
            }

            if (results.warnings != null)
            {
                foreach (var warning in results.warnings)
                {
                    writer.WriteLine($"WARN: {warning}");
                }
            }

            if (results.info != null)
            {
                foreach (var info in results.info)
                {
                    writer.WriteLine($"INFO: {info}");
                }
            }
        }
    }
}
#endif
