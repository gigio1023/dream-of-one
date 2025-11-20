using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// 모든 NPC가 공유하는 NavMeshAgent 기반 상태 머신의 뼈대.
    /// Idle → Move → Acting → Cooldown 기본 사이클을 제공한다.
    /// </summary>
    public enum NPCState
    {
        Idle,
        Moving,
        Acting,
        Cooldown
    }

    [RequireComponent(typeof(NavMeshAgent))]
    public abstract class NPCBase : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("WEL 및 디버깅에 표시할 NPC ID")]
        private string npcId = "NPC";

        [SerializeField]
        [Tooltip("순찰용 웨이포인트. 비어 있으면 제자리 유지.")]
        private Transform[] waypoints = System.Array.Empty<Transform>();

        protected NavMeshAgent agent;
        protected NPCState state = NPCState.Idle;
        private int waypointIndex = 0;

        public string NpcId => npcId;

        protected virtual void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
        }

        protected virtual void Update()
        {
            TickStateMachine();
        }

        /// <summary>
        /// 다음 웨이포인트를 목표로 설정한다. 포인트가 없으면 아무것도 하지 않는다.
        /// </summary>
        protected void MoveToNextWaypoint()
        {
            if (waypoints == null || waypoints.Length == 0)
            {
                return;
            }

            agent.SetDestination(waypoints[waypointIndex].position);
            waypointIndex = (waypointIndex + 1) % waypoints.Length;
            state = NPCState.Moving;
        }

        private void TickStateMachine()
        {
            switch (state)
            {
                case NPCState.Idle:
                    OnIdle();
                    break;
                case NPCState.Moving:
                    OnMoving();
                    break;
                case NPCState.Acting:
                    OnActing();
                    break;
                case NPCState.Cooldown:
                    OnCooldown();
                    break;
            }
        }

        /// <summary>
        /// 기본 행동: 다음 웨이포인트로 이동 시작.
        /// </summary>
        protected virtual void OnIdle()
        {
            MoveToNextWaypoint();
        }

        /// <summary>
        /// 목적지에 도달하면 Acting 단계로 전환한다.
        /// </summary>
        protected virtual void OnMoving()
        {
            if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.1f)
            {
                state = NPCState.Acting;
            }
        }

        /// <summary>
        /// 하위 클래스가 각자의 행위를 정의한다. 기본은 즉시 쿨다운.
        /// </summary>
        protected virtual void OnActing()
        {
            state = NPCState.Cooldown;
        }

        /// <summary>
        /// 짧은 휴식 후 Idle로 복귀.
        /// </summary>
        protected virtual void OnCooldown()
        {
            state = NPCState.Idle;
        }
    }
}
