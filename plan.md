# 게임 기획서 — 프로토타입판 (v0.1)

## 0) 하이컨셉

- *“AI만 사는 현실 같은 도시(꿈)에서, ‘사람’인 내가 정체를 들키지 않기 위해 **매 세션마다 달라지는 ‘꿈의 규칙’**을 관찰·가설·검증으로 찾아낸다.”**
- 핵심 고리: **관찰 → 가설(규칙 추정) → 소규모 실험 → 위장 루틴 유지**
- 플레이 판정: **규칙 위반 → 의심 축적 → 루머 확산 → ‘이곳은 꿈’ 인지율 임계 도달 시 종료**

---

## 1) 세션 구조(버티컬 슬라이스 범위)

- **플레이타임**: 20–30분 1세션
- **공간**: 소도시 1구역(거리+카페+공원)
- **NPC**: 12–20명(시야 내 LLM 상호작용 ≤ 1–2명 동시)
- **룰 수**: 세션당 **3개**(난이도: 쉬움 1, 중간 1, 까다로움 1)
- **승리 조건**: 25분 생존 또는 ‘규칙 3개 모두 서면 확정(노트에 잠금)’
- **패배 조건**: 월드 인지율 G ≥ 30% (집단이 “여긴 꿈”이라 확신)

> 원페이지식 정리/시각화로 팀 합의가 빨라지며 유지보수 비용이 낮습니다. 필요 시 요약판을 따로 두세요. (Game Developer)
> 

---

## 2) ‘꿈의 규칙’(Dream Rules) 설계

### 2.1 규칙 카테고리(초기 6종)

1. **에티켓**: 인사 방식·호칭·손 사용하는 법
2. **동선/행동**: 횡단보도 이용법, 좌/우보행, 공원 벤치 앉는 순서
3. **시간/주기**: 정각에는 대화 금지, 매 5분마다 짧은 정지
4. **언어/주제**: 금지어(날씨, ‘꿈’), 호칭은 성만 사용
5. **오브젝트/환경**: 문은 **2회** 밀어야 열림, 쓰레기통은 오른손만
6. **사회적 의식**: 동상 우측으로만 회전, 카페 입장 전 고개 끄덕임 1회

> 유치함 방지: 실제 사회규범 변주(에티켓·행정절차)에서 따오고, 난이도는 관찰로 추론 가능한 항목만. ‘말장난·초자연 규칙’은 프로토타입에 미포함(후속 확장).
> 
> 
> 비교군: *Papers, Please*는 “자잘하지만 해석 가능한 규칙”을 계단식으로 바꿔 **지속적 학습/검사**를 유도합니다. ([Game Developer](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-?utm_source=chatgpt.com))
> 

### 2.2 규칙 복잡도 예산(프로토타입 한정)

- **전제 수 ≤ 2개**, **예외 없음**, **기억단서 ≥ 2종 제공(표지판/제스처/대화 힌트)**
- **관찰로 검증 가능**(실험 2–3회면 확정 가능)
- 난점 레버: **관측 빈도(자주 보이게 배치)**, 벌칙 강도(의심 상승량)

> Baba Is You처럼 규칙 자체가 게임플레이를 정의하지만, 프로토타입에선 ‘규칙-관찰-검증’ 루프만 차용하고 문법 퍼즐은 배제합니다(범위 통제). (Game Developer)
> 

### 2.3 규칙 데이터 스키마(JSON)

```json
{
  "id": "RUL-ETQ-LeftHandWave",
  "category": "Etiquette",
  "statement": "공공장소에서 인사는 왼손만 사용한다.",
  "conditions": ["location:public", "actor:citizen"],
  "violation": ["player_greet_right_hand"],
  "clues": ["벽포스터_왼손그림", "NPC_발화_힌트", "입장시_왼손제스처_NPC"],
  "suspicion_delta": 8,
  "hint_density": "high"
}

```

> 데이터 드리븐 구조로 해야 룰 수/난이도 확장이 쉽습니다.
> 

### 2.4 규칙 생성기(온디바이스 LLM 보조, ‘제약된 랜덤’)

- **생성 범위**: *카테고리+관측가능 행동*만 허용(프롬프트에서 화이트리스트)
- **복잡도 상한**: 전제 ≤2, 문장 ≤1, 예외 금지
- **출력**: `statement / clues(최소2) / violation 트리거 / suspicion_delta`
- **검증**: 에디터 스크립트로 **플레이 가능성 체크(위반이 실제로 발생 가능한가?)**
- **재현성**: 시드 고정(동일 시드=동일 규칙 셋)

> 규칙은 추론 가능한 힌트와 짝이 지어져야 합니다. Outer Wilds의 “지식 로그”처럼, 단서가 플레이어의 “외부 기억”이 되도록 UI를 설계하면 파악 난이도가 안정됩니다. (rigdern.github.io)
> 

---

## 3) 규칙 발견 루프(게임플레이)

1. **관찰**: 군중 제스처, 벽 포스터, 문/의자 사용법, 호칭 등에서 단서 노출
2. **가설**: 노트에 체크박스 형식으로 **가설 등록**(ex. “인사는 왼손만?”)
3. **소실험**: 낮은 리스크 상황에서 가볍게 위반해 반응 확인(의심 소량↑)
4. **확정(락)**: 동일 규칙을 **3회 근거 확보 시 자동 확정**(*Obra Dinn*의 3개 단서 확정 감각 차용)
5. **운용**: 규칙을 내 루틴에 통합(위장·신뢰도↑)

> “3회 근거 후 확정”은 플레이어가 막연함을 벗어나 확실성을 얻는 체감 포인트를 줍니다. (intermittentmechanism.blog)
> 

---

## 4) 의심·인지율 시스템(간단 수식)

- **개인 의심도** `s_i(t)` : NPC i가 플레이어를 의심하는 정도(0–100)
    - 위반 시: `s_i += base(rule) * witness(i) * context`
    - **witness(i)**: 시야/거리/관계 가중(사회적 스텔스 문헌과 유사 개념) ([Game Developer](https://www.gamedeveloper.com/design/the-ai-of-hitman-2016-?utm_source=chatgpt.com))
- **루머 확산**: 소셜 그래프를 통해 확률적 전파(시간 지연/감쇠)
- **월드 인지율** `G` : 가중 평균(인구·중심지 가중)
    - 종료: `G ≥ 0.30` (튜닝 노브)

> 사회적 스텔스(Hitman)와 디렉터형 페이싱(Alien Isolation)에서 차용: 의심이 특정 구간을 넘으면 검문/소지품 검사/집중 시선 등 페이싱 이벤트가 스파이크처럼 발생. (Game Developer)
> 

---

## 5) NPC·AI 계층(퍼포먼스/현실감 양립)

- **LOD-A(시야 내)**: LLM 대화·간단 의사결정(Yes/No), 발화 길이 1–2문장
- **LOD-B(근접)**: 상태기계/행동트리(순찰, 앉기, 주문 등)
- **LOD-C(원거리/군중)**: 통계적 스케줄(출퇴근·행사), 루머 전파만 처리
- **디렉터**: 긴장도 곡선 유지(‘검문’·‘집단시선’·‘순찰 변경’ 이벤트 큐) — *Alien: Isolation*의 Director/Entity 분리 발상. ([aiandgames.com](https://www.aiandgames.com/p/revisiting-alien-isolation?utm_source=chatgpt.com))

---

## 6) 상호작용(LLM 제한 규격)

- **트리거**: (A) NPC가 먼저 건넴(상황/관계/시선), (B) 플레이어가 질문
- **프롬프트 핵심**
    - 시스템: “너는 [직업/조직/오늘 일정], 일상 톤, 1–2문장, 금지 주제 회피.”
    - 메모리: 최근 3턴 요약 + 지역 지식(내부 DB) + **확정된 규칙 목록**
    - 태스크: “플레이어 발화에 짧게 답하고, ‘규칙 힌트’ 또는 ‘의심 변화 ∈ [−1..+2]’ 산출.”
- **출력**: `utterance`, `hint_tag?`, `delta_susp`
- **호출 예산**: PC 분당 ~10, 모바일 분당 ~6(미응답 시 전통 AI 대사 폴백)

---

## 7) UI/UX — **파악 가능성**을 위한 최소 구성

- **지식 노트(Outer Wilds의 Ship Log 느낌)**:
    - 가설/단서/확정 상태를 **시각 그래프**로 표시(물음표→체크) ([rigdern.github.io](https://rigdern.github.io/a/learning-about-learning/learning-design-insights-from-outer-wilds/?utm_source=chatgpt.com))
- **피드백**: 위반 직후 주변 **미묘한 연출**(머리 돌림·말줄임표·시선선), HUD 수치 노출은 최소화(몰입 유지)
- **튜토리얼**: 1개 쉬운 규칙을 **의도적으로 노출**해 “가설→실험→확정” 과정을 체득

---

## 8) 콘텐츠·레벨 범위(프로토타입)

- **공간 1개**: 카페/공원/골목(시야 가리개, 문, 줄서기, 착석 포인트)
- **규칙 프리셋 12개**(세션에선 랜덤 3개 사용)
    - 예) “왼손 인사”, “문은 2회 밀기”, “대화 시작은 호칭만”, “벤치는 오른쪽부터 채운다”, “정각 10초 침묵”, “날씨 화제 금지” …
    - 각 규칙마다 **단서 2–3개**(포스터/제스처/음성 힌트) 포함
- **NPC 역할 4종**: 직원/손님/경비/행인(관계/권한 차등, 증언 신뢰도 차등)

---

## 9) 제작 파이프라인(1인 기준, 4–6주)

**주1**

- Unity LTS URP 프로젝트, **Cinemachine/Starter Assets**로 3인칭 이동+카메라 고정
- **ProBuilder**로 블록아웃, **NavMesh** 기본 길찾기(전통 AI)
- **지식 노트 UI**(가설 체크박스) 1차 구현
    
    *(참고: 원페이지식로 기획 고정, 문서 과잉 방지)* ([Game Developer](https://www.gamedeveloper.com/design/video-one-page-designs?utm_source=chatgpt.com))
    

**주2**

- **규칙 스키마/편집기** 제작 → 12개 프리셋 입력
- **단서 배치**(포스터/제스처/도어 상호작용)
- **의심/루머** 최소 루프(개인 s_i, 월드 G)

**주3**

- 온디바이스 LLM 통합(시야 내 1인 한정, 1–2문장, 실패 시 폴백)
- **가설→확정(3근거 룰)** 로직
- **디렉터**: 위반 누적 시 검문/집중시선 이벤트

**주4–5**

- 밸런스: 규칙 난이도/단서 밀도/의심 델타 튜닝
- **페이싱 체커**: 5분마다 단서 최소 1회 노출 보장(감독자 이벤트)
- **메모리/스트리밍**: Addressables로 장소 인스턴스 로드/릴리즈
    - 로드/릴리즈 **1:1** 매칭으로 메모리 누수 예방(유니티 권장) ([Unity Documentation](https://docs.unity3d.com/Packages/com.unity.addressables%401.20/manual/MemoryManagement.html?utm_source=chatgpt.com))

**주6**

- 플레이테스트(초보 5명) → “규칙 파악 시간/실패 원인/지식 노트 사용성” 수집
- 아웃풋: PC 단독 빌드(20–30분 데모)

---

## 10) 기술 메모(프로토타입 안전장치)

- **LLM 호출 제한**: 시야 내 1명만 활성, 응답 1–2문장, 타임아웃 1.5s → 폴백 대사
- **단서 보장**: 규칙마다 **‘힌트 밀도=high/med/low’**로 레벨 배치 자동 스케터
- **디렉터(페이싱)**: 3분 이상 단서가 안 보이면 **기획 이벤트**(예: 경비가 의식 제스처 시연) 트리거 — *Alien Isolation*의 Director처럼 **정보/긴장 분배자**로만 사용. ([aiandgames.com](https://www.aiandgames.com/p/revisiting-alien-isolation?utm_source=chatgpt.com))
- **Addressables**: 거점(카페 내부)만 번들 분리, 사용 후 즉시 Release(핸들 기준) — 유니티 가이드라인. ([Unity Documentation](https://docs.unity3d.com/Packages/com.unity.addressables%401.20/manual/MemoryManagement.html?utm_source=chatgpt.com))

---

## 11) 플레이어 경험 가드레일(“유치함”과 “불가해” 사이)

- **금지 룰**: 물리법칙 위반, 랜덤 암기(정답 외우기), UI만으로 확인되는 추상 규칙
- **관찰 가능성**: 누구나 **3회 미만 실험**으로 확정 가능
- **언어 힌트**: NPC는 **직설 대신 우회 힌트**(“다들 왼손을 쓰더라…”) — 스포일러 방지
- **실수 용인**: 첫 2회 위반은 경미한 의심, 반복 위반 때만 급상승
- **노트 잠금 보상**: 규칙 확정 시 **의심 완충(일시 면역)** 10초

---

## 12) 레퍼런스·영감 포인트

- **원페이지 GDD/요약의 힘** — 문서 길이보다 공유 가능성이 중요. ([Game Developer](https://www.gamedeveloper.com/design/video-one-page-designs?utm_source=chatgpt.com))
- **규칙·검사 구조** — *Papers, Please*의 변화하는 절차/불일치 포착(검사 모드). ([Game Developer](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-?utm_source=chatgpt.com))
- **규칙-기반 설계 철학** — *Baba Is You*의 “규칙이 곧 게임” 아이디어(프로토타입에선 ‘관찰·추론’만 차용). ([Game Developer](https://www.gamedeveloper.com/design/designing-i-baba-is-you-i-s-delightfully-innovative-rule-writing-system?utm_source=chatgpt.com))
- **지식의 외부화** — *Outer Wilds*의 **Ship Log**처럼 플레이어 지식을 UI에 **외재화**. ([rigdern.github.io](https://rigdern.github.io/a/learning-about-learning/learning-design-insights-from-outer-wilds/?utm_source=chatgpt.com))
- **사회적 스텔스/군중 반응** — *Hitman*의 사회 규범 맞추기, 시선/불법행위 가시화. ([Game Developer](https://www.gamedeveloper.com/design/the-ai-of-hitman-2016-?utm_source=chatgpt.com))
- **디렉터 AI** — *Alien: Isolation*의 Director vs Entity 분리, 페이싱 관리. ([aiandgames.com](https://www.aiandgames.com/p/revisiting-alien-isolation?utm_source=chatgpt.com))

---

## 13) 즉시 구현 체크리스트(요약)

- [ ]  3인칭 이동+카메라(Cinemachine/Starter Assets)
- [ ]  규칙 스키마/에디터 & 12개 프리셋 입력
- [ ]  단서 배치(표지판, 제스처, 오브젝트 상호작용)
- [ ]  의심/루머 간단 수식 적용, G 임계 종료
- [ ]  가설→확정(근거 3회) 노트 UI
- [ ]  LLM 한정 대화(시야 내 1명), 폴백 대사
- [ ]  디렉터: 단서 보장/검문 이벤트
- [ ]  Addressables 로드/릴리즈 1:1 적용(메모리 가드) ([Unity Documentation](https://docs.unity3d.com/Packages/com.unity.addressables%401.20/manual/MemoryManagement.html?utm_source=chatgpt.com))

---

### 마지막 팁

- **규칙 3개**로 시작하세요. “단서 과잉 → 너무 쉽다”보다 “단서 부족 → 불친절”이 훨씬 해로워요.
- **가설 기록은 자동화**(플레이가 단서를 응시·근접·대화로 접하면 노트에 자동 적재).
- **테스트는 숫자로**: “규칙 파악까지 평균 6–8분”, “위반 1회당 이탈률 X%” 같은 운영 지표를 메모.