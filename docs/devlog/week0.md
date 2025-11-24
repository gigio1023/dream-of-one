# Week 0 — 새 Input System 이동/카메라 (추천 5~8시간)

목표: Legacy Input 없이 새 Input System으로 이동/카메라를 확보한다. Unity/C# 완전 초보 기준으로 에디터 조작까지 상세히 적었다. PlayerInput UnityEvent와 NavMesh는 “맛보기” 옵션으로 두고 성공 경험에 집중한다.

## 준비 체크
- Unity Hub에서 LTS 설치 후 프로젝트를 연다.
- 메뉴 `Edit > Project Settings > Player > Active Input Handling`을 `Input System Package (New)`로 설정 후 재시작.

## 입력 에셋 만들기
1) 메뉴 `Assets > Create > Input Actions` → 이름을 `InputActions.inputactions`로 저장 (권장 위치: `Assets/Settings/`).  
2) 더블클릭해 열고 `Action Maps`에서 `+` → 이름 `Player`.  
3) Actions 추가:  
   - `Move` → Action Type `Value`, Control Type `Vector2`, Binding `2D Vector Composite` 추가 → Up=W, Down=S, Left=A, Right=D.  
   - `Look` → Action Type `Value`, Control Type `Vector2`, Binding `Mouse Delta`.  
   - `Interact` → Action Type `Button`, Binding `E`(추가로 `F`도 넣어도 됨).  
4) 저장(Ctrl/Cmd+S). 에셋을 프로젝트 뷰에서 한 번 클릭해 참조 가능 상태인지 확인.

## 이동 스크립트와 씬 배치
1) 씬 만들기: `File > New Scene` → 3D(URP) → Plane 추가, Capsule 추가해 이름 `Player`.  
2) `Player`에 `Character Controller` 컴포넌트 추가.  
3) 스크립트 폴더 생성: `Assets/Scripts/Core/` → `PlayerController.cs` 생성 후 아래 내용 붙여넣기.  
```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    [SerializeField] private InputActionReference moveAction;
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float gravity = -9.81f;

    private CharacterController controller;
    private Vector3 velocity;

    private void Awake() => controller = GetComponent<CharacterController>();
    private void OnEnable() => moveAction.action.Enable();
    private void OnDisable() => moveAction.action.Disable();

    private void Update()
    {
        Vector2 moveInput = moveAction.action.ReadValue<Vector2>();
        Vector3 move = new Vector3(moveInput.x, 0f, moveInput.y);

        controller.Move(moveSpeed * Time.deltaTime * move);

        // 간단 중력
        if (controller.isGrounded && velocity.y < 0f) velocity.y = -2f;
        velocity.y += gravity * Time.deltaTime;
        controller.Move(velocity * Time.deltaTime);
    }
}
```
4) Player에 스크립트를 붙이고, Inspector의 `Move Action` 슬롯에 `InputActions.inputactions/Player/Move`를 드래그.  
5) Play → WASD로 이동이 되는지 확인.

## Cinemachine 카메라
1) `Window > Package Manager` → `Unity Registry`에서 Cinemachine 설치.  
2) Hierarchy `Cinemachine > Virtual Camera` 생성 → Inspector `Follow`/`Look At`에 Player 드래그.  
3) Main Camera에 `Cinemachine Brain` 컴포넌트가 없다면 추가.  
4) Play → 카메라가 Player를 부드럽게 따라오는지 확인. 필요하면 VCam의 Body `Framing Transposer` Offset/Damping 값을 조절.

## 옵션(스트레치)
- PlayerInput 경로 테스트: Player에 `Player Input` 추가 → Actions에 `InputActions.inputactions`, Behavior `Invoke Unity Events` → `Events > Player > OnMove`에 `PlayerController.OnMove(InputAction.CallbackContext)`를 연결해 이벤트 기반 입력을 시험. (폴링 방식이 이미 동작하므로 실패해도 OK)
- NavMesh 맛보기(1~2시간): `Window > AI > Navigation` → Plane 선택 후 Navigation Static 체크 → Bake → Capsule 하나에 `NavMeshAgent` 추가해 `SetDestination(new Vector3(5,0,5))` 스크립트로 1회 이동 확인.

## DoD
- 새 Input System으로 WASD 이동 + Cinemachine 추적 동작(`Input.GetAxis` 미사용).
- `InputActions.inputactions`에 Move/Look/Interact 저장, 씬에서 참조.
- GIF 1개, 학습 메모 5줄(옵션 작업 실패해도 괜찮음).
