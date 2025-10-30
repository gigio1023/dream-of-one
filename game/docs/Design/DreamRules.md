# 꿈의 규칙

## 스키마 (ScriptableObject)
- id: string (예: RUL-ETQ-LeftHandWave)
- category: Etiquette|Movement|Time|Language|Object|Ritual
- statement: string (한 문장 서술형)
- conditions: string[] (location:*, actor:*)
- violation: string[] (이벤트 키)
- clues: string[] (태그; ≥ 2개)
- suspicionDelta: int (0..100)
- hintDensity: high|med|low

## 예시 (초기 3개)
- 왼손 인사
- 문 2회 밀기
- 정각 침묵 (10초)

---

## 필드 ↔ 코드 매핑 (현재 상태)
- `id` → `ClueTrigger`가 `HypothesisTracker.LogClue(ruleId)`로 전달하여 확정 판정에 사용
- `category` → UI/로그 필터용(후속), 현재는 분류 메타
- `statement` → 노트/툴팁 표기(후속), 현재는 데이터 보관
- `clues[]` → 단서 배치 태그 참조(최소 2개 권장)
- `suspicionDelta` → `SuspicionManager.ApplyViolation(rule, witnesses, pos)`에서 NPC 의심 변화에 사용

미사용/후속 연결 예정:
- `conditions[]` → 룰 유효 범위(위치/행위자) 체크 로직 (VS-M3+)
- `violation[]` → 실 위반 이벤트 키 매핑(애니메이션/인터랙션 트리거) (VS-M2+)
- `hintDensity` → 레벨 배치 자동 스캐터(디렉터/스포너 파라미터) (VS-M3+)
