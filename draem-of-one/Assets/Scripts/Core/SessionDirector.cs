using DreamOfOne.UI;
using UnityEngine;
using UnityEngine.AI;

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
            uiManager?.ShowPrompt("Goal: observe rules, avoid suspicion, and survive the investigation.");
            uiManager?.ShowToast("Enter buildings to gather context. Avoid raising G too high.", 4f);
        }

        private void Update()
        {
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
            uiManager?.ShowPrompt($"SESSION END — {reason}");
            uiManager?.ShowToast("Session complete.", 5f);

            ApplyFreeze();
        }

        public void ResetSession()
        {
            ended = false;
            endReason = string.Empty;
            elapsedSeconds = 0f;
            RestoreActors();
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
    }
}
