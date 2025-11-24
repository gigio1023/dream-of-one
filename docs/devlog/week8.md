# Week 8 — 경찰 상태 머신 + 루프 완주 (추천 5~7시간)

목표: PoliceController 상태 머신과 Interrogation/Verdict UI를 연결해 신고→심문→판정 루프를 1회 완주한다. 기존 로그/G UI와 연동이 깨지지 않는지 확인한다.

## 해야 할 일
- 상태 머신
  - PoliceController에 Idle/MoveToTarget/Interrogating/Returning 등을 정의.
  - 신고 큐를 Poll해 대상 NPC/Player 위치로 이동 → 도달 시 Interrogating 상태로 전환.
- 상태 전이 표(예시)
  - Idle → (신고 큐 있음) → MoveToTarget
  - MoveToTarget → (목표 도달) → Interrogating
  - Interrogating → (판정 끝) → Returning
  - Returning → (복귀 완료) → Idle
- 심문/판정 UI
  - InterrogationStarted 시 팝업(UI Panel) 표시, 입력 잠금 여부 결정.
  - VerdictGiven 시 결과 텍스트/토스트 표시, G/로그 갱신 확인.
- 연동 확인
  - 루프 중 EventRecord/토스트가 정상 누적되는지 확인.
  - 실패 케이스(신고 큐가 비었는데 호출 등)에 대한 방어 코드를 넣는다.
- 간단 흐름 예시
```csharp
public class PoliceController : MonoBehaviour
{
    public enum State { Idle, MoveToTarget, Interrogating, Returning }
    public State state = State.Idle;

    public NavMeshAgent agent;
    public Transform home;
    public float interrogateSeconds = 3f;

    private Transform target;

    private void Update()
    {
        switch (state)
        {
            case State.Idle:
                TryFetchNextReport();
                break;
            case State.MoveToTarget:
                if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance)
                    StartCoroutine(Interrogate());
                break;
            case State.Returning:
                if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance)
                    state = State.Idle;
                break;
        }
    }

    private void TryFetchNextReport()
    {
        // target = ReportQueue.Dequeue();
        if (target == null) return;
        agent.SetDestination(target.position);
        state = State.MoveToTarget;
    }

    private IEnumerator Interrogate()
    {
        state = State.Interrogating;
        // UI: InterrogationStarted
        yield return new WaitForSeconds(interrogateSeconds);
        // UI: VerdictGiven
        agent.SetDestination(home.position);
        state = State.Returning;
    }
}
```

## DoD
- 신고→이동/접촉→심문 UI→판정 UI 흐름이 1회 성공.
- 플레이 영상/GIF 1개 기록.
