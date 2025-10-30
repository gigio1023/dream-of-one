# 규칙 프리셋 (템플릿)

템플릿:
- id: RUL-<CAT>-<Slug>
- category: Etiquette|Movement|Time|Language|Object|Ritual
- statement: ...
- conditions: [...]
- violation: [...]
- clues: [...]
- suspicion_delta: int
- hint_density: high|med|low

---

## 콘텐츠 가이드 (가안)
- **복잡도**: 전제 ≤ 2, 예외 없음, 한 문장 서술
- **단서 밀도**: 최소 2, 권장 3(시각 1, 제스처 1, 언어 1)
- **의심 델타 가이드**: 쉬움 4–8, 중간 9–15, 까다로움 16–25
- **목격 가중치**: 가까움/정면일수록 가중 ↑ (코드: `NpcPerception.GetWitnessFactor`)
- **테스트 가능성**: 2–3회 실험으로 확정 가능해야 함
- **배치 팁**: 규칙 단서 중 1개는 플레이 경로상 확정적으로 보이게 배치

튜토리얼 후보(가안):
- 쉬움: 왼손 인사(Etiquette)
- 중간: 문 2회 밀기(Object)
- 까다로움: '꿈' 단어 금지(Language)

---

초기 스텁:
- RUL-ETQ-LeftHandWave (왼손 인사)
- RUL-OBJ-DoorPushTwice (문 2회 밀기)
- RUL-TIM-SilenceOnHour (정각 침묵)
- RUL-LAN-NoDreamWord ("꿈" 단어 금지)
