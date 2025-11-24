# Week 6 — 로그 파이프라인 (추천 4~6시간)

목표: WorldEventLog → SemanticShaper → UI 로그 5줄 + 기본 토스트를 연결한다. 데이터가 한 방향으로 흐르는지 확인한다.

## 해야 할 일
- EventRecord 파이프
  - ViolationDetected 등 이벤트를 `EventRecord` 구조체/클래스로 append.
  - FIFO 형태로 최근 5개를 가져와 UI에 표시하는 메서드 작성.
  - 예시:
```csharp
public struct EventRecord
{
    public string type;
    public string actor;
    public string payload;
    public DateTime time;
}

public class WorldEventLog
{
    private readonly Queue<EventRecord> queue = new();
    private const int Max = 64;

    public event Action<IEnumerable<EventRecord>> OnChanged;

    public void Append(EventRecord e)
    {
        queue.Enqueue(e);
        while (queue.Count > Max) queue.Dequeue();
        OnChanged?.Invoke(queue);
    }
}
```
- SemanticShaper
  - EventRecord를 짧은 문장으로 변환하는 함수(템플릿 기반) 작성.
  - 한국어 한 줄 요약을 반환해 UI에 쓸 수 있도록 한다.
  - 예시: `"[{time:HH:mm:ss}] {actor}가 {payload} 위반을 일으킴"`
- UI 로그 5줄
  - HUD의 로그 영역에 TextMeshPro 5줄을 업데이트하는 스크립트 작성.
  - 매 프레임이 아니라 이벤트 발생 시만 갱신하도록 한다.
- 토스트
  - 간단한 큐를 두고 1개씩 1~2초 표시 후 다음으로 넘어가게 한다.
  - 중복 트리거를 방지하거나 쿨타임을 둔다.
  - 코루틴 예시:
```csharp
private readonly Queue<string> toastQueue = new();
private bool showing;

public void EnqueueToast(string message)
{
    toastQueue.Enqueue(message);
    if (!showing) StartCoroutine(ShowToasts());
}

private IEnumerator ShowToasts()
{
    showing = true;
    while (toastQueue.Count > 0)
    {
        toastText.text = toastQueue.Dequeue();
        toastPanel.SetActive(true);
        yield return new WaitForSeconds(1.5f);
    }
    toastPanel.SetActive(false);
    showing = false;
}
```

## DoD
- ViolationDetected → EventRecord → 문장 → UI 5줄 표시가 확인된다.
- 토스트가 겹치지 않고 순차 재생.
