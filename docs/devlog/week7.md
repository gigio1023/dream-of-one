# Week 7 — 의심/신고 시스템 (추천 5~7시간)

목표: SuspicionComponent, GlobalSuspicionSystem, ReportManager 신고 큐, sᵢ 디버그 UI를 연결한다. 위반 이벤트가 수치 변동과 신고 트리거로 이어지는지 확인한다.

## 해야 할 일
- SuspicionComponent
  - 각 NPC/Player에 sᵢ를 보관하는 컴포넌트 추가.
  - ViolationDetected를 구독해 sᵢ를 상승시키는 메서드 작성(파라미터화된 증가량).
  - 임계값/감쇠 시간 등을 Inspector에서 조정 가능하게 노출.
- GlobalSuspicionSystem
  - 모든 sᵢ를 합산/정규화해 전역 G를 계산.
  - G가 바뀔 때 이벤트를 발행해 HUD G 바가 갱신되도록 한다.
- ReportManager
  - sᵢ 또는 G가 임계 이상이면 신고 큐에 Enqueue.
  - 중복 신고 방지를 위해 쿨다운 또는 “이미 신고 중” 플래그를 둔다.
- 디버그 UI
  - TextMeshPro로 sᵢ 리스트와 G 값을 화면에 표시해 수치 변화를 눈으로 확인.
  - 값이 변할 때마다 UI가 즉시 갱신되도록 이벤트 또는 Update에서 갱신.
- 예시 로직
```csharp
public class SuspicionComponent : MonoBehaviour
{
    public float value;
    public float decayPerSecond = 0.02f;
    public float threshold = 0.6f;

    private void Update() => value = Mathf.Max(0f, value - decayPerSecond * Time.deltaTime);
}

public class GlobalSuspicionSystem : MonoBehaviour
{
    public SuspicionComponent[] targets;
    public event Action<float> OnGlobalChanged;

    private void Update()
    {
        float sum = 0f;
        foreach (var t in targets) sum += t.value;
        float g = Mathf.Clamp01(sum / targets.Length);
        OnGlobalChanged?.Invoke(g);
    }
}
```
- 신고 큐 쿨다운
  - 마지막 신고 시각을 저장하고 일정 시간(예: 5초) 내 중복 신고를 막는다.
  - 또는 “신고 진행 중” 플래그를 세워 경찰이 처리할 때까지 추가 Enqueue를 막는다.

## DoD
- 위반 시 sᵢ/G가 갱신되고 임계 초과 시 신고 큐에 들어간다.
- 디버그 UI에서 값 변화를 확인(멈추면 로그로 원인 파악).
