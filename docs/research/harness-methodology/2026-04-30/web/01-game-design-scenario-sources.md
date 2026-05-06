# Game Design and Scenario Design Sources

조사일: 2026-04-30

이 문서는 게임 하네스 방법론을 정리하기 위한 영어권 중심의 권위 자료 맵이다. 범위는 게임 디자인 교과서, 공식 출판사 페이지, 학술 PDF, 대학 강의 자료, 산업 단체와 산업 매체 자료로 제한했다. 핵심 질문은 "시나리오를 어떻게 실행 가능한 디자인 산출물로 바꾸는가"이며, Dream of One의 텍스트 위험면, deterministic authority, NPC/Station 조사 구조에 적용 가능한 기준만 추렸다.

## Source Map

| Area | Source Title | Type | URL | Use in Harness Methodology |
| --- | --- | --- | --- | --- |
| Playcentric design | Game Design Workshop: A Playcentric Approach to Creating Innovative Games | Publisher book page | https://www.routledge.com/Game-Design-Workshop-A-Playcentric-Approach-to-Creating-Innovative-Games/Fullerton/p/book/9781032607009 | 경험 목표, formal/dramatic/dynamic systems, prototyping, playtesting, design communication의 기본 축 |
| Lens-based design | The Art of Game Design: A Book of Lenses, Third Edition | Publisher book page | https://www.routledge.com/The-Art-of-Game-Design-A-Book-of-Lenses-Third-Edition/Schell/p/book/9781138632059 | 질문형 렌즈로 경험, 플레이어, mechanics, story, indirect control, playtesting 점검 |
| Foundational theory | Rules of Play: Game Design Fundamentals | University press book page | https://mitpress.mit.edu/9780262240451/rules-of-play/ | meaningful play, systems, emergence, information, storytelling, social play의 공통 어휘 |
| Mechanics-Dynamics-Aesthetics | MDA: A Formal Approach to Game Design and Game Research | Academic PDF | https://www.cs.northwestern.edu/~hunicke/MDA.pdf | Mechanics -> Dynamics -> Aesthetics로 구현 단위와 플레이어 경험을 연결 |
| Narrative design | The Game Narrative Toolbox | Publisher book page | https://www.routledge.com/The-Game-Narrative-Toolbox/Heussner-Finley-Brandes-Hepler-Lemay/p/book/9781032438962 | narrative designer의 역할, concept-to-testing 단계별 요구사항, writing과 implementation 연결 |
| Narrative craft | Narrative Design: The Craft of Writing for Games | Publisher book page | https://www.routledge.com/Narrative-Design-The-Craft-of-Writing-for-Games/Breault/p/book/9780367191528 | AAA 개발 현장의 narrative design 과제, 포트폴리오/과제/템플릿 기반 산출물 |
| Game writing discipline | Game Writing | Industry association page | https://igda.org/sigs/game-writing/ | dialogue scripts, overarching narrative structure, documentation 등 game writer 산출물 범위 |
| Player experience goals | Designing for Player Experience: How Professional Game Developers Communicate Design Visions | DiGRA academic PDF | https://dl.digra.org/index.php/dl/article/download/503/503/500 | 의도한 player experience를 팀 전체 의사결정 기준으로 공유하는 방식 |
| Emotion-focused PX | The 4 Keys 2 Fun | Author/industry research page | https://www.nicolelazzaro.com/the4-keys-to-fun/ | Hard Fun, Easy Fun, Serious Fun, People Fun으로 경험 목표를 감정 트리거로 분해 |
| Production process | A Playful Production Process | University press book page | https://mitpress.mit.edu/9780262045513/a-playful-production-process/ | ideation, preproduction, production, post-production과 milestone/deliverable 연결 |
| Prototyping and production | Game Design, Prototyping, & Production | University syllabus | https://courses.ideate.cmu.edu/53-471/s2020/index.html%3Fp%3D10.html | rules/mechanics, balance, emergent story, interactive narratives, rapid prototyping, playtesting |
| Preproduction deliverables | CS390 Game Preproduction: Deliverables | University course page | https://www.cs.bsu.edu/~pvgestwicki/courses/cs390Sp26/deliverables/ | concept document, design goals, player experience, core gameplay, vertical slice, pitch 산출물 구조 |
| Design documentation | How To: Write a Game Design Document | Industry reference | https://www.gamedeveloper.com/design/how-to-write-a-game-design-document | monolithic GDD 대신 searchable/readable/concise living documentation 운영 |

## Findings

### Game Design Workshop

Game Design Workshop는 Dream of One 하네스에 가장 직접적인 프로세스 원천이다. Routledge/CRC의 5th edition 설명은 formal, dramatic, dynamic systems를 함께 다루고, playcentric design techniques와 emotion-focused experience goals, prototyping, playtesting, revising을 명시한다. 따라서 이 책은 "게임 아이디어"를 바로 콘텐츠로 쓰기보다 다음 순서로 낮추는 근거가 된다.

1. 플레이어가 겪어야 하는 경험 목표를 먼저 문장화한다.
2. 그 목표를 formal elements, dramatic elements, system dynamics로 분해한다.
3. 분해된 단위만 prototype으로 만들고 playtest로 검증한다.
4. 검증 결과를 design communication 산출물로 되돌린다.

Dream of One에 적용하면 "플레이어는 조사자가 아니다"라는 원칙은 lore 문장이 아니라 formal element다. 조사 주체는 NPC와 Station systems이고, 플레이어 행동은 노출과 Cover Test의 입력이 된다. dramatic element는 Dream Law, inquest, verdict, termination 같은 텍스트 권위면이며, dynamic system은 플레이어 발화와 시스템 판정이 누적되며 Exposure를 바꾸는 루프다.

### The Art of Game Design

The Art of Game Design는 구현 전 질문 목록으로 유용하다. Routledge 설명은 경험, player, mechanics, story, indirect control, world, character, space, aesthetics, document communication, playtesting을 한 흐름 안에 둔다. 하네스 관점에서 핵심은 "렌즈"가 산출물을 대체하지 않고 산출물의 결함을 드러내는 점이다.

Dream of One에서는 각 시나리오 beat에 최소한 다음 렌즈를 통과시켜야 한다.

- Player lens: 플레이어가 지금 무엇을 할 수 있다고 믿는가.
- Experience lens: 그 믿음이 Cover Test, Exposure, inquest 압박으로 어떤 감정을 만들도록 설계되었는가.
- Mechanics lens: 그 감정이 어떤 deterministic rule, state transition, fallback selection으로 실행되는가.
- Story/indirect control lens: NPC와 Station text가 플레이어를 직접 설명하지 않고 어떤 선택으로 유도하는가.
- Playtesting lens: 테스트 러너가 어떤 observable evidence로 성공/실패를 판정하는가.

### Rules of Play

Rules of Play는 개별 장르 팁보다 상위의 공통 어휘를 제공한다. MIT Press는 이 책을 board games, sports, computer and video games를 아우르는 unified model로 소개하며, play, design, interactivity, emergence, information, storytelling, social play 등을 game design schema로 다룬다.

하네스에 필요한 포인트는 meaningful play다. Dream of One의 텍스트는 단순 서사가 아니라 시스템이 해석하는 입력과 출력이다. 따라서 "의미 있는 플레이"는 예쁜 문장보다 다음 조건을 충족해야 한다.

- 플레이어의 선택 또는 발화가 시스템 상태에 식별 가능한 영향을 준다.
- 그 영향은 NPC/Station 조사의 다음 텍스트, 규칙, verdict surface에 반영된다.
- 플레이어가 자기 의도와 시스템 해석 사이의 간극을 감지할 수 있다.

이 기준은 scenario 문서를 runtime schema, test fixture, evidence output으로 낮추는 검증 기준이 된다.

### MDA: A Formal Approach to Game Design and Game Research

MDA는 하네스 설계에 가장 간결한 변환 모델을 준다. 원문 PDF는 Mechanics, Dynamics, Aesthetics를 통해 game design/development, criticism, technical research 사이의 gap을 줄이려는 formal approach라고 설명한다. 이 프레임은 시나리오를 실행 가능하게 만드는 중간 계층을 강제한다.

- Mechanics: runtime schema, rule, threshold, trigger, dialogue condition, scheduler slot, verdict predicate.
- Dynamics: NPC suspicion loop, Station intake loop, Cover Test pressure, Exposure accumulation, fallback branch.
- Aesthetics: 감시당함, 말이 위험해짐, 무해한 답변이 증거로 변함, 절차가 닫혀감.

Dream of One에서 narrative beat는 Aesthetics로 직접 구현되지 않는다. 먼저 Mechanics로 내려가고, 그 Mechanics가 실행 중 Dynamics를 만들며, 그 결과로 플레이어가 특정 Aesthetics를 경험해야 한다. 하네스는 이 변환을 역추적할 수 있어야 한다.

### Narrative Design and Game Writing

The Game Narrative Toolbox는 narrative designer가 concept부터 final testing까지 개발팀 안에서 어떤 요구사항을 맡는지 다룬다. Narrative Design: The Craft of Writing for Games는 narrative design과 game design 과제를 함께 훈련시키는 책이며, 실제 개발 업무 기반의 과제와 템플릿을 포함한다. IGDA Game Writing SIG는 game writer의 작업 범위를 dialogue scripts, overarching narrative structure, documentation 등으로 정의한다.

세 자료를 합치면 "시나리오 작성"은 완성 원고 생산이 아니라 production-ready narrative artifacts 생산이다. Dream of One의 narrative 산출물은 다음처럼 나뉘어야 한다.

- Scenario premise: 사건, 압박, Station 절차, NPC 조사 의도.
- Beat sheet: intake, probe, contradiction, escalation, inquest, verdict, termination 같은 실행 순서.
- Dialogue/bark table: 발화자, 조건, 노출 효과, 반복 가능 여부, fallback.
- Evidence semantics: 어떤 텍스트가 증거가 되고, 어떤 규칙이 그 증거를 소비하는지.
- Implementation notes: Godot scene, runtime schema field, backend validator, smoke/evidence test 연결.

이 구분은 writer가 작성한 텍스트를 엔진과 백엔드가 읽을 수 있는 상태로 바꾸는 최소 단위다.

### Player Experience Goals

Designing for Player Experience는 큰 스튜디오에서 의도한 player experience를 어떻게 팀 전체 design vision으로 공유하는지 조사한 DiGRA 논문이다. 논문은 intended player experience가 개발 중 의사결정을 정렬하는 기준이 된다고 설명한다. The 4 Keys 2 Fun은 감정을 Hard Fun, Easy Fun, Serious Fun, People Fun 같은 플레이 경험 경로로 나누어, story cutscene이 아니라 gameplay에서 감정이 나와야 한다는 관점을 보강한다.

Dream of One의 player experience goal은 "재미있다"가 아니라 더 좁아야 한다.

- 말하는 순간 조사 대상이 되는 느낌.
- 텍스트 선택지가 안전한 UI가 아니라 위험면이라는 느낌.
- NPC와 Station이 플레이어보다 절차를 더 잘 알고 있다는 느낌.
- 판정이 즉흥 연출이 아니라 이미 정해진 법과 증거 절차로 닫힌다는 느낌.

각 목표는 대응 Mechanics를 가져야 한다. 예를 들어 "텍스트가 위험면"이라는 목표는 dialogue option risk tags, evidence extraction, exposure delta, verdict predicate로 내려가야 한다.

### Prototyping and Playtesting

Game Design Workshop, A Playful Production Process, CMU Game Design, Prototyping, & Production 자료는 공통적으로 빠른 prototype과 playtesting을 production 이전의 증거 생성 방식으로 본다. CMU syllabus는 rapid prototyping, iterative design, agile development, playtesting을 명시하고, Ball State CS390 deliverables는 concept document, player experience, core gameplay, vertical slice, pitch를 순차 산출물로 둔다.

하네스에서는 playtest를 "사람에게 물어본 소감"만으로 두면 안 된다. Dream of One은 deterministic product authority가 핵심이므로 prototype/playtest 산출물은 다음 evidence를 남겨야 한다.

- 어떤 scenario state에서 시작했는가.
- 어떤 player input 또는 simulated input을 넣었는가.
- 어떤 NPC/Station response가 선택되었는가.
- Exposure, Cover Test, inquest, verdict 상태가 어떻게 바뀌었는가.
- fallback이 발생했다면 왜 발생했고, deterministic selection이 재현되는가.

이 구조는 현재 Godot evidence run과 backend check를 디자인 검증의 일부로 승격시키는 근거가 된다.

### Turning Scenario into Executable Design Artifacts

수집한 자료를 하나의 변환 파이프라인으로 합치면 다음 순서가 가장 실용적이다.

1. Experience Goal: 플레이어가 느껴야 할 압박, 불확실성, 책임, 절차적 종결감을 한 문장으로 쓴다.
2. Design Pillars: Dream Law, Cover Test, Exposure, Station intake, inquest, verdict, termination처럼 바꿀 수 없는 권위 규칙을 분리한다.
3. MDA Mapping: 각 pillar를 Mechanics, Dynamics, Aesthetics로 나눈다.
4. Scenario Beat Sheet: 플레이 가능한 순서를 intake/probe/escalation/verdict 같은 beat로 쪼갠다.
5. Runtime Contract: 각 beat가 필요로 하는 schema field, state variable, trigger, predicate, fallback을 적는다.
6. Content Table: dialogue, signage, report text, NPC bark, Station notice를 조건과 효과가 있는 row로 만든다.
7. Prototype Slice: 가장 위험한 loop 하나만 Godot/backend에서 실행한다.
8. Playtest/Evidence: 사람 피드백과 자동 evidence를 함께 모아 design goal과 runtime result를 비교한다.
9. Revision Record: 바뀐 텍스트, 규칙, threshold, fallback reason을 추적한다.

핵심은 scenario를 "장면 설명"으로 끝내지 않는 것이다. scenario는 runtime contract와 evidence contract를 낳아야 한다. 그래야 narrative design이 구현팀에 던져진 문서가 아니라, 검증 가능한 product authority가 된다.

## Game Harness Takeaways for Dream of One

- Game Design Workshop의 playcentric process를 기준으로, 모든 시나리오는 먼저 experience goal을 선언한 뒤 formal/dramatic/dynamic systems로 내려간다.
- The Art of Game Design의 lenses는 Dream Law, Cover Test, Exposure, inquest, verdict가 플레이어 경험과 실제 mechanics를 동시에 만족하는지 점검하는 질문 세트로 쓴다.
- Rules of Play와 MDA는 "텍스트가 위험면"이라는 테마를 runtime rule, state transition, evidence output으로 바꾸는 공통 언어다.
- Narrative design/game writing 자료들은 dialogue script보다 더 넓은 산출물을 요구한다. Dream of One의 writer-facing artifact는 beat sheet, condition table, evidence semantics, fallback notes를 포함해야 한다.
- Player experience goals는 감정 단어로만 남기지 않는다. "감시당함", "말이 증거가 됨", "절차가 닫힘" 같은 목표는 각각 tag, threshold, scheduler, verdict predicate로 연결한다.
- Prototyping/playtesting은 playable scene 확인이 아니라 deterministic evidence 생성이다. Godot smoke/evidence run과 backend schema check를 design playtest의 일부로 취급한다.
- 시나리오가 executable design artifact가 되려면 마지막 산출물이 prose가 아니라 runtime contract여야 한다: state, trigger, condition, text surface, fallback, expected evidence가 한 세트로 남아야 한다.
