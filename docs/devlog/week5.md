# Week 5 — 상호작용 Zone + Violation 이벤트 (추천 5~7시간)

목표: Queue/Bench/Photo Zone을 만들고 Interact 입력으로 ViolationDetected를 발행한다. 입력/트리거 파이프가 끊기지 않는지 확인한다.

## 해야 할 일
- Zone 프리팹 3종
  - 빈 오브젝트에 Box/Sphere Collider를 Trigger로 설정.
  - Gizmo용 색상 지정 스크립트나 `OnDrawGizmos`로 범위가 보이게 한다.
  - 프리팹으로 저장(`Assets/Prefabs/Zones/`).
- Interact 처리
  - Player가 Trigger 안에 들어오면 UI 프롬프트(예: “E: Interact”)를 HUD에 띄운다.
  - `InputActions.inputactions`의 Interact 액션을 구독하거나 UnityEvent로 연결.
  - Interact 입력을 받으면 Zone 스크립트가 ViolationDetected 이벤트를 발행.
- 이벤트 파이프
  - ScriptableObject 이벤트나 C# event를 하나 정의하여 WorldEventLog가 구독할 수 있게 설계.
  - 최소한 Console.Log로 “Violation: ZoneName”이 찍히도록 한다.
  - 예시:
```csharp
public static class GameEvents
{
    public static event Action<string> OnViolation;
    public static void RaiseViolation(string name) => OnViolation?.Invoke(name);
}

public class ZoneInteract : MonoBehaviour
{
    [SerializeField] private string zoneName = "Queue";
    private bool canInteract;

    private void OnTriggerEnter(Collider other) => canInteract = true;
    private void OnTriggerExit(Collider other) => canInteract = false;

    public void OnInteract(InputAction.CallbackContext ctx)
    {
        if (!canInteract || !ctx.performed) return;
        GameEvents.RaiseViolation(zoneName);
    }
}
```
- 프롬프트 표시
  - Trigger 안/밖에서 UI 프롬프트를 켜고 끄는 간단한 스크립트를 HUD에 연결.

## DoD
- 각 Zone에서 Interact 입력이 감지되고 ViolationDetected 이벤트가 발생.
- 콘솔/임시 텍스트로 이벤트 수신을 확인(중복 트리거 없이).
