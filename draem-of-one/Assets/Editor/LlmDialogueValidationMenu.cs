#if UNITY_EDITOR
using DreamOfOne.Core;
using DreamOfOne.LLM;
using DreamOfOne.LucidCover;
using DreamOfOne.NPC;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class LlmDialogueValidationMenu
    {
        private const string LocalEndpoint = "http://localhost:11434/utterance";
        private const float FallbackTimeoutSeconds = 6f;
        private const float TimeoutSlackSeconds = 0.5f;
        private const string ValidationRuleId = "DL_G1_NO_DREAM_TALK";
        private const string ValidationPlaceId = "Station";

        private static bool pending;
        private static double startedAt;
        private static int baselineUtterances;
        private static WorldEventLog log;
        private static LLMClient client;

        [MenuItem("Tools/DreamOfOne/LLM/Use Local Endpoint (Ollama)")]
        private static void UseLocalEndpoint()
        {
            var llmClient = FindClient();
            if (llmClient == null)
            {
                Debug.LogWarning("[LLM] LLMClient not found in scene.");
                return;
            }

            ApplyClientConfig(llmClient, LLMClient.Provider.LocalEndpoint, true, LocalEndpoint);
        }

        [MenuItem("Tools/DreamOfOne/LLM/Disable LLM (Mock)")]
        private static void DisableLlm()
        {
            var llmClient = FindClient();
            if (llmClient == null)
            {
                Debug.LogWarning("[LLM] LLMClient not found in scene.");
                return;
            }

            ApplyClientConfig(llmClient, LLMClient.Provider.Mock, false, null);
        }

        [MenuItem("Tools/DreamOfOne/LLM/Run NPC Dialogue Validation")]
        private static void RunNpcDialogueValidation()
        {
            if (!EditorApplication.isPlaying)
            {
                Debug.LogWarning("[LLM] Enter Play Mode and run validation again.");
                return;
            }

            log = Object.FindFirstObjectByType<WorldEventLog>();
            if (log == null)
            {
                Debug.LogWarning("[LLM] WorldEventLog missing; cannot validate NPC dialogue.");
                return;
            }

            var dialogue = Object.FindFirstObjectByType<NpcDialogueSystem>();
            if (dialogue == null)
            {
                Debug.LogWarning("[LLM] NpcDialogueSystem missing; cannot validate NPC dialogue.");
                return;
            }

            client = FindClient();
            baselineUtterances = CountNpcUtterances(log);

            var trigger = new EventRecord
            {
                actorId = "Validator",
                actorRole = "QA",
                eventType = EventType.ViolationDetected,
                ruleId = ValidationRuleId,
                sourceId = DreamLawDetectorIds.SpeechDreamTalk,
                placeId = ValidationPlaceId,
                topic = "LLM_VALIDATION",
                note = "LLM validation trigger",
                severity = 3
            };

            log.RecordEvent(trigger);

            if (client != null)
            {
                Debug.Log($"[LLM] Validation trigger fired. Provider={client.CurrentProvider} Enabled={client.LlmEnabled} Endpoint={client.Endpoint}");
            }
            else
            {
                Debug.Log("[LLM] Validation trigger fired. LLMClient missing (fallback expected).");
            }

            startedAt = EditorApplication.timeSinceStartup;
            pending = true;
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
        }

        private static void Tick()
        {
            if (!pending)
            {
                return;
            }

            if (!EditorApplication.isPlaying)
            {
                Finish("Play Mode stopped");
                return;
            }

            if (EditorApplication.timeSinceStartup - startedAt > GetTimeoutSeconds())
            {
                Finish("Timed out waiting for NPC utterance");
                return;
            }

            if (log == null)
            {
                Finish("WorldEventLog missing");
                return;
            }

            if (CountNpcUtterances(log) <= baselineUtterances)
            {
                return;
            }

            var last = FindLastNpcUtterance(log);
            if (last == null)
            {
                Finish("NPC utterance count increased but record missing");
                return;
            }

            Debug.Log($"[LLM] NPC utterance received: {last.actorId} ({last.actorRole}) -> \"{last.note}\"");
            Finish("Validation complete");
        }

        private static void Finish(string message)
        {
            pending = false;
            EditorApplication.update -= Tick;
            Debug.Log($"[LLM] {message}");
        }

        private static int CountNpcUtterances(WorldEventLog worldLog)
        {
            if (worldLog == null || worldLog.Events == null)
            {
                return 0;
            }

            int count = 0;
            foreach (var record in worldLog.Events)
            {
                if (record != null && record.eventType == EventType.NpcUtterance)
                {
                    count++;
                }
            }

            return count;
        }

        private static EventRecord FindLastNpcUtterance(WorldEventLog worldLog)
        {
            if (worldLog == null || worldLog.Events == null)
            {
                return null;
            }

            for (int i = worldLog.Events.Count - 1; i >= 0; i--)
            {
                var record = worldLog.Events[i];
                if (record != null && record.eventType == EventType.NpcUtterance)
                {
                    return record;
                }
            }

            return null;
        }

        private static LLMClient FindClient()
        {
            return Object.FindFirstObjectByType<LLMClient>();
        }

        private static double GetTimeoutSeconds()
        {
            if (client == null)
            {
                return FallbackTimeoutSeconds;
            }

            float configuredTimeout = client.RequestTimeoutSeconds;
            if (configuredTimeout <= 0f)
            {
                return FallbackTimeoutSeconds;
            }

            return Mathf.Max(FallbackTimeoutSeconds, configuredTimeout + TimeoutSlackSeconds);
        }

        private static void ApplyClientConfig(LLMClient llmClient, LLMClient.Provider provider, bool enabled, string endpointOverride)
        {
            if (llmClient == null)
            {
                return;
            }

            if (!EditorApplication.isPlaying)
            {
                Undo.RecordObject(llmClient, "Configure LLMClient");
            }

            llmClient.ConfigureProvider(provider, enabled, endpointOverride);

            if (!EditorApplication.isPlaying)
            {
                EditorUtility.SetDirty(llmClient);
            }

            string endpoint = string.IsNullOrEmpty(endpointOverride) ? llmClient.Endpoint : endpointOverride;
            Debug.Log($"[LLM] LLMClient configured: Provider={provider} Enabled={enabled} Endpoint={endpoint}");
        }
    }
}
#endif
