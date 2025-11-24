# Week 4 — NPC 4종 + 순찰/정지 (추천 5~7시간)

목표: Clerk/Elder/Tourist/Police 프리팹을 만들고 간단한 순찰/정지 상태를 구현한다.

## 해야 할 일
- 프리팹 생성
  - Capsule 4개를 만든 뒤 이름/색상만 다르게 해서 `Assets/Prefabs/NPC/`에 각각 Prefab 저장.
  - 공통으로 `NavMeshAgent` 파라미터(속도/회전/가속/Stopping Distance)를 설정.
- 순찰 스크립트
  - Waypoint 배열(Transform 리스트)을 따라 `SetDestination`을 순환하는 간단 스크립트 작성.
  - `arrivalThreshold`를 두어 너무 멀리서 다음 포인트로 넘어가지 않게 한다.
  - 예시:
```csharp
public class SimplePatrol : MonoBehaviour
{
    public Transform[] waypoints;
    public float arrivalThreshold = 0.5f;
    public float waitSeconds = 2f;

    private NavMeshAgent agent;
    private int index;
    private bool waiting;

    private void Awake() => agent = GetComponent<NavMeshAgent>();
    private void Start() => MoveNext();

    private void Update()
    {
        if (waiting || agent.pathPending) return;
        if (agent.remainingDistance <= arrivalThreshold)
            StartCoroutine(WaitAndNext());
    }

    private void MoveNext()
    {
        if (waypoints.Length == 0) return;
        agent.SetDestination(waypoints[index].position);
    }

    private IEnumerator WaitAndNext()
    {
        waiting = true;
        yield return new WaitForSeconds(waitSeconds);
        index = (index + 1) % waypoints.Length;
        waiting = false;
        MoveNext();
    }
}
```
- 정지 상태 전환
  - 순찰 중 특정 포인트에서 `Wait` 상태로 전환해 2~3초 정지 후 다음 포인트로 이동하도록 코루틴 또는 타이머 작성.
- 씬 배치
  - 1~2개 순찰 경로를 빈 오브젝트로 정리(`PatrolRoute1` 등)하고 NPC 프리팹에 할당.

## DoD
- 4종 프리팹이 존재하고, 최소 1개 순찰 루프와 1개 정지 상태 전환이 동작.
