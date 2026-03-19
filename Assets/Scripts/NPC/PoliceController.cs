using UnityEngine;
using UnityEngine.AI;
using DreamOfOne.Core;

namespace DreamOfOne.NPC
{
    [RequireComponent(typeof(NavMeshAgent))]
    public class PoliceController : MonoBehaviour
    {
        enum State { Patrol, MoveToPlayer, Interrogate }

        [SerializeField] Transform[] patrolPoints = System.Array.Empty<Transform>();
        [SerializeField] float interrogationDistance = 2.5f;
        [SerializeField] float cooldownSeconds = 10f;
        [SerializeField] float exposurePerInterrogation = 25f;

        NavMeshAgent agent;
        State state = State.Patrol;
        Transform player;
        ReportManager reportManager;
        WorldEventLog eventLog;
        ExposureSystem exposureSystem;
        int patrolIndex;
        float cooldownTimer;
        string lastVerdictReason = "";

        public string LastVerdictReason => lastVerdictReason;

        public void Configure(Transform playerTransform, ReportManager reports, WorldEventLog log, ExposureSystem exposure = null)
        {
            player = playerTransform;
            reportManager = reports;
            eventLog = log;
            exposureSystem = exposure;
        }

        public void ResetPoliceState()
        {
            state = State.Patrol;
            cooldownTimer = 0f;
        }

        void Start()
        {
            agent = GetComponent<NavMeshAgent>();
            if (patrolPoints.Length > 0)
                agent.SetDestination(patrolPoints[0].position);
        }

        void Update()
        {
            switch (state)
            {
                case State.Patrol: UpdatePatrol(); break;
                case State.MoveToPlayer: UpdateMoveToPlayer(); break;
                case State.Interrogate: UpdateInterrogate(); break;
            }
        }

        void UpdatePatrol()
        {
            if (reportManager != null && reportManager.ShouldTriggerInterrogation())
            {
                // Consume report immediately on state transition
                reportManager.TryConsumeReport(out _);
                state = State.MoveToPlayer;
                if (player != null)
                    agent.SetDestination(player.position);
                return;
            }

            if (patrolPoints.Length == 0) return;
            if (!agent.pathPending && agent.remainingDistance < 0.5f)
            {
                patrolIndex = (patrolIndex + 1) % patrolPoints.Length;
                agent.SetDestination(patrolPoints[patrolIndex].position);
            }
        }

        void UpdateMoveToPlayer()
        {
            if (player == null) { state = State.Patrol; return; }

            agent.SetDestination(player.position);
            float dist = Vector3.Distance(transform.position, player.position);

            if (dist <= interrogationDistance)
            {
                state = State.Interrogate;
                agent.isStopped = true;
                BeginInterrogation();
            }
        }

        void UpdateInterrogate()
        {
            cooldownTimer += Time.deltaTime;
            if (cooldownTimer >= cooldownSeconds)
            {
                agent.isStopped = false;
                cooldownTimer = 0f;
                state = State.Patrol;
            }
        }

        void BeginInterrogation()
        {
            // Add exposure (bridges suspicion → lose condition)
            if (exposureSystem != null)
            {
                exposureSystem.AddExposure(
                    (int)exposurePerInterrogation, "police", "", "interrogation", "police", transform.position);
            }

            if (eventLog != null)
            {
                eventLog.RecordEvent(new EventRecord
                {
                    eventType = DreamOfOne.Core.EventType.InterrogationStarted,
                    actorId = "police",
                    targetId = "player",
                    timestamp = Time.time,
                    position = transform.position
                });
            }
            Debug.Log("[Police] Interrogation started! Exposure increased.");
        }
    }
}
