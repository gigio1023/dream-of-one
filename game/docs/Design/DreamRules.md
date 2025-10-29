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
