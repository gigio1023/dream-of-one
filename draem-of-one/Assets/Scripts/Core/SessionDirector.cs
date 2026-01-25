using System;
using System.Collections.Generic;
using System.Text;
using DreamOfOne.Localization;
using DreamOfOne.UI;
using UnityEngine;
using UnityEngine.AI;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DreamOfOne.Core
{
    /// <summary>
    /// 세션 진행/종료 조건을 관리한다.
    /// </summary>
    public sealed class SessionDirector : MonoBehaviour
    {
        private enum SessionEndTrigger
        {
            TimeLimit,
            Suspicion,
            Verdict
        }

        private enum SessionEnding
        {
            Cleared,
            Guilty,
            Unresolved,
            Escalation
        }

        private struct SessionMetrics
        {
            public int totalEvents;
            public int violations;
            public int reports;
            public int evidence;
            public int rumors;
            public int artifacts;
            public int verdicts;
            public float globalSuspicion;
            public float elapsedSeconds;
        }

        [SerializeField]
        private GlobalSuspicionSystem globalSuspicionSystem = null;

        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private UIManager uiManager = null;

        [SerializeField]
        private float sessionDurationSeconds = 12f * 60f;

        [SerializeField]
        [Range(0f, 1f)]
        private float suspicionEndThreshold = 0.65f;

        [SerializeField]
        private bool endOnVerdict = true;

        [SerializeField]
        private KeyCode restartKey = KeyCode.R;

        [SerializeField]
        private KeyCode quitKey = KeyCode.Q;

        [SerializeField]
        private bool allowQuit = true;

        private float elapsedSeconds = 0f;
        private bool ended = false;
        private bool freezeApplied = false;
        private string endReason = string.Empty;

        public bool IsEnded => ended;
        public string EndReason => endReason;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureDirector()
        {
            if (FindFirstObjectByType<SessionDirector>() != null)
            {
                return;
            }

            var host = new GameObject("SessionDirector");
            host.AddComponent<SessionDirector>();
        }

        private void Awake()
        {
            if (globalSuspicionSystem == null)
            {
                globalSuspicionSystem = FindFirstObjectByType<GlobalSuspicionSystem>();
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }
        }

        private void OnEnable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded += HandleEvent;
            }
        }

        private void OnDisable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded -= HandleEvent;
            }
        }

        private void Start()
        {
            ShowStartHints();
        }

        private void Update()
        {
            if (ended)
            {
                HandleEndInput();
                return;
            }

            Tick(Time.deltaTime);
        }

        private void HandleEvent(EventRecord record)
        {
            ProcessEvent(record);
        }

        public void Tick(float deltaTime)
        {
            if (ended)
            {
                return;
            }

            elapsedSeconds += deltaTime;

            if (elapsedSeconds >= sessionDurationSeconds)
            {
                EndSession(SessionEndTrigger.TimeLimit, "Time limit reached. You slipped away.");
                return;
            }

            if (globalSuspicionSystem != null && globalSuspicionSystem.GlobalSuspicion >= suspicionEndThreshold)
            {
                EndSession(SessionEndTrigger.Suspicion, "G reached critical. You were flagged.");
            }
        }

        public void ProcessEvent(EventRecord record)
        {
            if (ended || record == null)
            {
                return;
            }

            if (endOnVerdict && record.eventType == EventType.VerdictGiven)
            {
                string verdict = string.IsNullOrEmpty(record.note) ? "Verdict delivered." : record.note;
                EndSession(SessionEndTrigger.Verdict, $"Verdict: {verdict}");
            }
        }

        private void EndSession(SessionEndTrigger trigger, string reason)
        {
            if (ended)
            {
                return;
            }

            ended = true;
            endReason = reason;
            var metrics = BuildMetrics();
            var summary = BuildSummaryLine(metrics);
            var endText = BuildEndSummary(trigger, reason, metrics);
            if (uiManager != null)
            {
                uiManager.ShowSessionEnd(endText);
                uiManager.ShowToast(summary, 6f);
            }

            ApplyFreeze();
        }

        private SessionMetrics BuildMetrics()
        {
            var metrics = new SessionMetrics
            {
                totalEvents = 0,
                violations = 0,
                reports = 0,
                evidence = 0,
                verdicts = 0,
                rumors = 0,
                artifacts = 0,
                globalSuspicion = globalSuspicionSystem != null ? globalSuspicionSystem.GlobalSuspicion : 0f,
                elapsedSeconds = elapsedSeconds
            };

            if (eventLog != null)
            {
                var events = eventLog.Events;
                metrics.totalEvents = events.Count;
                for (int i = 0; i < events.Count; i++)
                {
                    var record = events[i];
                    if (record == null)
                    {
                        continue;
                    }

                    switch (record.eventType)
                    {
                        case EventType.ViolationDetected:
                            metrics.violations++;
                            break;
                        case EventType.ReportFiled:
                            metrics.reports++;
                            break;
                        case EventType.EvidenceCaptured:
                        case EventType.TicketIssued:
                        case EventType.CctvCaptured:
                            metrics.evidence++;
                            break;
                        case EventType.VerdictGiven:
                            metrics.verdicts++;
                            break;
                        case EventType.RumorShared:
                        case EventType.RumorConfirmed:
                        case EventType.RumorDebunked:
                            metrics.rumors++;
                            break;
                    }
                }
            }

            var artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            if (artifactSystem != null)
            {
                metrics.artifacts = artifactSystem.GetArtifacts().Count;
            }

            return metrics;
        }

        private string BuildSummaryLine(SessionMetrics metrics)
        {
            return $"Summary: events {metrics.totalEvents}, violations {metrics.violations}, reports {metrics.reports}, evidence {metrics.evidence}, rumors {metrics.rumors}, artifacts {metrics.artifacts}, verdicts {metrics.verdicts}.";
        }

        private string BuildEndSummary(SessionEndTrigger trigger, string reason, SessionMetrics metrics)
        {
            var ending = ResolveEnding(trigger, metrics);
            int score = ComputeScore(trigger, metrics);
            string grade = GetGrade(score);
            var why = BuildWhyReasons(trigger, metrics);
            var replay = BuildReplayReasons(ending, trigger);
            var summary = BuildSummaryLine(metrics);

            var builder = new StringBuilder();
            builder.AppendLine($"SESSION END — {ending}");
            builder.AppendLine($"Reason: {reason}");
            builder.AppendLine($"Score: {score} ({grade})");
            builder.AppendLine($"Why: {string.Join(", ", why)}");
            builder.AppendLine($"Replay: {string.Join(" / ", replay)}");
            builder.AppendLine(summary);
            builder.AppendLine();
            builder.AppendLine($"Restart: {restartKey} / Quit: {(allowQuit ? quitKey.ToString() : "N/A")}");
            return builder.ToString();
        }

        private SessionEnding ResolveEnding(SessionEndTrigger trigger, SessionMetrics metrics)
        {
            if (trigger == SessionEndTrigger.Suspicion || metrics.globalSuspicion >= suspicionEndThreshold)
            {
                return SessionEnding.Escalation;
            }

            if (metrics.verdicts > 0)
            {
                if (metrics.evidence >= 2 && metrics.violations <= 1)
                {
                    return SessionEnding.Cleared;
                }

                return SessionEnding.Guilty;
            }

            if (metrics.evidence >= 3 && metrics.reports >= 2)
            {
                return SessionEnding.Cleared;
            }

            return SessionEnding.Unresolved;
        }

        private int ComputeScore(SessionEndTrigger trigger, SessionMetrics metrics)
        {
            int score = 50;
            score += metrics.evidence * 5;
            score += metrics.reports * 4;
            score += metrics.artifacts * 3;
            score += metrics.verdicts * 6;
            score += metrics.rumors * 2;
            score -= metrics.violations * 6;
            score -= Mathf.RoundToInt(metrics.globalSuspicion * 20f);

            if (trigger == SessionEndTrigger.Suspicion)
            {
                score -= 10;
            }

            return Mathf.Clamp(score, 0, 100);
        }

        private static string GetGrade(int score)
        {
            if (score >= 85)
            {
                return "S";
            }

            if (score >= 70)
            {
                return "A";
            }

            if (score >= 55)
            {
                return "B";
            }

            if (score >= 40)
            {
                return "C";
            }

            return "D";
        }

        private List<string> BuildWhyReasons(SessionEndTrigger trigger, SessionMetrics metrics)
        {
            var candidates = new List<(string text, int weight)>();

            if (metrics.evidence >= 3)
            {
                candidates.Add(("Strong evidence trail", metrics.evidence * 3));
            }

            if (metrics.reports >= 2)
            {
                candidates.Add(("Filed reports", metrics.reports * 3));
            }

            if (metrics.artifacts >= 2)
            {
                candidates.Add(("Artifacts secured", metrics.artifacts * 2));
            }

            if (metrics.verdicts > 0)
            {
                candidates.Add(("Verdict delivered", 6));
            }

            if (metrics.rumors >= 3)
            {
                candidates.Add(("Rumors traced", metrics.rumors * 2));
            }

            if (metrics.violations >= 2)
            {
                candidates.Add(("Multiple violations", -metrics.violations * 3));
            }

            if (metrics.globalSuspicion >= suspicionEndThreshold)
            {
                candidates.Add(("Suspicion peaked", -8));
            }

            if (trigger == SessionEndTrigger.TimeLimit)
            {
                candidates.Add(("Time expired", -5));
            }

            candidates.Sort((a, b) => Math.Abs(b.weight).CompareTo(Math.Abs(a.weight)));

            var results = new List<string>();
            for (int i = 0; i < candidates.Count && results.Count < 2; i++)
            {
                results.Add(candidates[i].text);
            }

            if (results.Count == 0)
            {
                results.Add("Session concluded");
            }

            return results;
        }

        private List<string> BuildReplayReasons(SessionEnding ending, SessionEndTrigger trigger)
        {
            var replay = new List<string>();

            switch (ending)
            {
                case SessionEnding.Cleared:
                    replay.Add("Push for a riskier ending");
                    replay.Add("Chase different incidents");
                    break;
                case SessionEnding.Guilty:
                    replay.Add("Gather more evidence before verdict");
                    replay.Add("Reduce violations to clear suspicion");
                    break;
                case SessionEnding.Unresolved:
                    replay.Add("Trigger more incidents to reach a verdict");
                    replay.Add("File reports to increase clarity");
                    break;
                case SessionEnding.Escalation:
                    replay.Add("Keep suspicion low");
                    replay.Add("Resolve incidents earlier");
                    break;
            }

            if (trigger == SessionEndTrigger.TimeLimit)
            {
                replay[0] = "Finish key objectives sooner";
            }

            return replay;
        }

        public void ResetSession()
        {
            ended = false;
            endReason = string.Empty;
            elapsedSeconds = 0f;
            RestoreActors();
            ResetRuntimeState();
            ShowStartHints();
        }

        private void ResetRuntimeState()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (eventLog != null)
            {
                eventLog.ResetLog();
            }

            var artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            artifactSystem?.ResetArtifacts();

            var reportManager = FindFirstObjectByType<ReportManager>();
            reportManager?.ResetReports();

            var objective = FindFirstObjectByType<ObjectiveCompassUI>();
            objective?.ResetObjective();

            var police = FindFirstObjectByType<DreamOfOne.NPC.PoliceController>();
            police?.ResetPoliceState();

            foreach (var suspicion in FindObjectsByType<DreamOfOne.NPC.SuspicionComponent>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                suspicion.ResetAfterInterrogation();
            }

            if (globalSuspicionSystem == null)
            {
                globalSuspicionSystem = FindFirstObjectByType<GlobalSuspicionSystem>();
            }

            globalSuspicionSystem?.Recalculate();
            uiManager?.ResetUiState();
        }

        private void ApplyFreeze()
        {
            if (freezeApplied)
            {
                return;
            }

            freezeApplied = true;
            var player = FindFirstObjectByType<PlayerController>();
            if (player != null)
            {
                player.enabled = false;
            }

            foreach (var patrol in FindObjectsByType<DreamOfOne.NPC.SimplePatrol>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                patrol.enabled = false;
            }

            foreach (var police in FindObjectsByType<DreamOfOne.NPC.PoliceController>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                police.enabled = false;
            }

            foreach (var agent in FindObjectsByType<NavMeshAgent>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                agent.isStopped = true;
            }
        }

        private void RestoreActors()
        {
            if (!freezeApplied)
            {
                return;
            }

            freezeApplied = false;
            var player = FindFirstObjectByType<PlayerController>();
            if (player != null)
            {
                player.enabled = true;
            }

            foreach (var patrol in FindObjectsByType<DreamOfOne.NPC.SimplePatrol>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                patrol.enabled = true;
            }

            foreach (var police in FindObjectsByType<DreamOfOne.NPC.PoliceController>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                police.enabled = true;
            }

            foreach (var agent in FindObjectsByType<NavMeshAgent>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                agent.isStopped = false;
            }
        }

        private void HandleEndInput()
        {
            if (WasRestartPressed())
            {
                ResetSession();
                return;
            }

            if (allowQuit && WasQuitPressed())
            {
                QuitGame();
            }
        }

#if ENABLE_INPUT_SYSTEM
        private static bool WasKeyPressed(KeyCode keyCode)
        {
            if (Keyboard.current == null)
            {
                return false;
            }

            if (!TryGetInputSystemKey(keyCode, out var inputKey))
            {
                return false;
            }

            return Keyboard.current[inputKey].wasPressedThisFrame;
        }

        private static bool TryGetInputSystemKey(KeyCode keyCode, out Key inputKey)
        {
            inputKey = Key.None;

            if (keyCode == KeyCode.None)
            {
                return false;
            }

            switch (keyCode)
            {
                case KeyCode.Return:
                    inputKey = Key.Enter;
                    return true;
                case KeyCode.KeypadEnter:
                    inputKey = Key.NumpadEnter;
                    return true;
                case KeyCode.Space:
                    inputKey = Key.Space;
                    return true;
                case KeyCode.Backspace:
                    inputKey = Key.Backspace;
                    return true;
                case KeyCode.Delete:
                    inputKey = Key.Delete;
                    return true;
                case KeyCode.Escape:
                    inputKey = Key.Escape;
                    return true;
            }

            var keyName = keyCode.ToString();
            if (keyName.StartsWith("Alpha", System.StringComparison.Ordinal))
            {
                var digitName = "Digit" + keyName.Substring("Alpha".Length);
                return System.Enum.TryParse(digitName, out inputKey);
            }

            if (keyName.StartsWith("Keypad", System.StringComparison.Ordinal))
            {
                var numpadName = "Numpad" + keyName.Substring("Keypad".Length);
                return System.Enum.TryParse(numpadName, out inputKey);
            }

            return System.Enum.TryParse(keyName, out inputKey);
        }
#endif

        private bool WasRestartPressed()
        {
#if ENABLE_INPUT_SYSTEM
            return WasKeyPressed(restartKey);
#else
            return Input.GetKeyDown(restartKey);
#endif
        }

        private bool WasQuitPressed()
        {
#if ENABLE_INPUT_SYSTEM
            return WasKeyPressed(quitKey);
#else
            return Input.GetKeyDown(quitKey);
#endif
        }

        private void QuitGame()
        {
#if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
#else
            Application.Quit();
#endif
        }

        private void ShowStartHints()
        {
            uiManager?.ShowPrompt(LocalizationManager.Text(LocalizationKey.GoalPrompt));
            uiManager?.ShowToast(LocalizationManager.Text(LocalizationKey.ControlsToast), 4f);
        }
    }
}
