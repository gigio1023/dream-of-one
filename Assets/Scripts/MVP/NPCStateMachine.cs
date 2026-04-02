// Assets/Scripts/MVP/NPCStateMachine.cs
using UnityEngine;
using UnityEngine.AI;

public interface INPCState
{
    void Enter();
    void Execute(float dt);
    void Exit();
}

public class SimpleStateMachine
{
    INPCState current;
    public INPCState Current => current;

    public void ChangeState(INPCState next)
    {
        if (next == current) return;
        current?.Exit();
        current = next;
        current?.Enter();
    }

    public void Update(float dt) => current?.Execute(dt);
}

public class NPCIdleState : INPCState
{
    readonly float duration;
    float elapsed;
    public bool Finished => elapsed >= duration;
    public NPCIdleState(float duration = 3f) { this.duration = duration; }
    public void Enter() => elapsed = 0f;
    public void Execute(float dt) => elapsed += dt;
    public void Exit() { }
}

public class NPCPatrolState : INPCState
{
    readonly NavMeshAgent agent;
    readonly Transform[] waypoints;
    int index;

    public NPCPatrolState(NavMeshAgent agent, Transform[] waypoints)
    {
        this.agent = agent;
        this.waypoints = waypoints;
    }

    public void Enter()
    {
        if (waypoints.Length == 0) return;
        agent.isStopped = false;
        agent.SetDestination(waypoints[index].position);
    }

    public void Execute(float dt)
    {
        if (waypoints.Length == 0) return;
        if (!agent.pathPending && agent.remainingDistance < 0.5f)
        {
            index = (index + 1) % waypoints.Length;
            agent.SetDestination(waypoints[index].position);
        }
    }

    public void Exit() => agent.isStopped = true;
}

public class NPCTalkState : INPCState
{
    readonly float duration;
    float elapsed;
    public bool Finished => elapsed >= duration;
    public NPCTalkState(float duration = 6f) { this.duration = duration; }
    public void Enter() => elapsed = 0f;
    public void Execute(float dt) => elapsed += dt;
    public void Exit() { }
}

public class NPCWorkState : INPCState
{
    readonly float duration;
    float elapsed;
    public bool Finished => elapsed >= duration;
    public NPCWorkState(float duration = 10f) { this.duration = duration; }
    public void Enter() => elapsed = 0f;
    public void Execute(float dt) => elapsed += dt;
    public void Exit() { }
}

[RequireComponent(typeof(NavMeshAgent))]
public class NPCBehavior : MonoBehaviour
{
    [SerializeField] Transform[] waypoints;
    [SerializeField] float idleDuration = 3f;
    [SerializeField] float talkDuration = 6f;
    [SerializeField] float workDuration = 10f;

    SimpleStateMachine fsm;
    NavMeshAgent agent;
    NPCIdleState idleState;
    NPCPatrolState patrolState;
    NPCTalkState talkState;
    NPCWorkState workState;

    void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        fsm = new SimpleStateMachine();
        idleState = new NPCIdleState(idleDuration);
        patrolState = new NPCPatrolState(agent, waypoints);
        talkState = new NPCTalkState(talkDuration);
        workState = new NPCWorkState(workDuration);
        fsm.ChangeState(idleState);
    }

    void Update()
    {
        fsm.Update(Time.deltaTime);
        if (fsm.Current == idleState && idleState.Finished)
            fsm.ChangeState(patrolState);
        else if (fsm.Current == patrolState && !agent.pathPending && agent.remainingDistance < 0.5f)
            fsm.ChangeState(workState);
        else if (fsm.Current == workState && workState.Finished)
            fsm.ChangeState(idleState);
    }

    public void EnterTalkState() => fsm.ChangeState(talkState);
    public void ExitTalkState() => fsm.ChangeState(idleState);
}
