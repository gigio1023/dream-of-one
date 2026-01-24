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
                EndSession("Time limit reached. You slipped away.");
                return;
            }

            if (globalSuspicionSystem != null && globalSuspicionSystem.GlobalSuspicion >= suspicionEndThreshold)
            {
                EndSession("G reached critical. You were flagged.");
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
                EndSession($"Verdict: {verdict}");
            }
        }

        private void EndSession(string reason)
        {
            if (ended)
            {
                return;
            }

            ended = true;
            endReason = reason;
            string summary = BuildSummary();
            if (uiManager != null)
            {
                uiManager.ShowSessionEnd($"SESSION END — {reason}\n{summary}\n\nRestart: {restartKey} / Quit: {(allowQuit ? quitKey.ToString() : "N/A")}");
                uiManager.ShowToast(summary, 6f);
            }

            ApplyFreeze();
        }

        private string BuildSummary()
        {
            int violations = 0;
            int reports = 0;
            int evidence = 0;
            int verdicts = 0;
            int rumors = 0;
            int total = 0;

            if (eventLog != null)
            {
                var events = eventLog.Events;
                total = events.Count;
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
                            violations++;
                            break;
                        case EventType.ReportFiled:
                            reports++;
                            break;
                        case EventType.EvidenceCaptured:
                        case EventType.TicketIssued:
                        case EventType.CctvCaptured:
                            evidence++;
                            break;
                        case EventType.VerdictGiven:
                            verdicts++;
                            break;
                        case EventType.RumorShared:
                        case EventType.RumorConfirmed:
                        case EventType.RumorDebunked:
                            rumors++;
                            break;
                    }
                }
            }

            int artifacts = 0;
            var artifactSystem = FindFirstObjectByType<ArtifactSystem>();
            if (artifactSystem != null)
            {
                artifacts = artifactSystem.GetArtifacts().Count;
            }

            return $"Summary: events {total}, violations {violations}, reports {reports}, evidence {evidence}, rumors {rumors}, artifacts {artifacts}, verdicts {verdicts}.";
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

        private bool WasRestartPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current == null)
            {
                return false;
            }

            return restartKey switch
            {
                KeyCode.R => Keyboard.current[Key.R].wasPressedThisFrame,
                KeyCode.Space => Keyboard.current[Key.Space].wasPressedThisFrame,
                KeyCode.Return => Keyboard.current[Key.Enter].wasPressedThisFrame,
                _ => Keyboard.current[Key.R].wasPressedThisFrame
            };
#else
            return Input.GetKeyDown(restartKey);
#endif
        }

        private bool WasQuitPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current == null)
            {
                return false;
            }

            return quitKey switch
            {
                KeyCode.Q => Keyboard.current[Key.Q].wasPressedThisFrame,
                KeyCode.Escape => Keyboard.current[Key.Escape].wasPressedThisFrame,
                _ => Keyboard.current[Key.Q].wasPressedThisFrame
            };
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
            uiManager?.ShowPrompt("Goal: observe rules, avoid suspicion, and survive the investigation.");
            uiManager?.ShowToast("WASD 이동 / E 상호작용 / I 증거 / L 로그 / C 케이스 / F1 디버그", 4f);
        }
    }
}
