# Director-Level Design Framework Sources

이 문서는 비전문가 director가 Codex/agents를 지휘해 일관된 indie game을 만들 때 필요한 영어권 game design framework를 정리한다. 핵심은 "좋은 아이디어 목록"이 아니라, agent가 매번 같은 게임을 향해 판단하도록 만드는 지시 체계다.

## Research Summary

Director-level design은 한 명의 취향을 강요하는 일이 아니다. 팀과 agent가 각각 다른 파일, 장면, 시스템을 만질 때도 같은 player experience를 보존하도록 판단 기준을 압축하는 일이다.

가장 쓸모 있는 공통 구조는 다음과 같다.

- **Creative vision**: 이 게임이 플레이어에게 남겨야 하는 경험을 한 문장으로 고정한다.
- **Design pillars**: 기능 목록이 아니라 의사결정 기준 3-5개를 둔다.
- **MDA chain**: 목표 감각을 Aesthetics, Dynamics, Mechanics로 역추적한다.
- **Playcentric loop**: player experience goal을 정하고 prototype, playtest, evaluation으로 반복한다.
- **Discipline bibles**: narrative, art, level, UX, accessibility, localization이 같은 vision을 번역한 문서가 되게 한다.
- **Evidence gates**: agent 산출물은 "작동함"보다 "목표 경험을 관찰 가능하게 만들었는가"로 판정한다.

## Source Map

| # | Source Title | URL | Director Harness Use |
|---|---|---|---|
| 1 | MDA: A Formal Approach to Game Design and Game Research | https://www.cs.northwestern.edu/~hunicke/MDA.pdf | 경험 목표를 mechanics로 바로 내리지 않고 aesthetics -> dynamics -> mechanics로 번역한다. |
| 2 | Book Excerpt: Game Design Workshop, 5th Edition | https://www.gamedeveloper.com/design/book-excerpt-game-design-workshop | playcentric iteration과 player experience goals를 director loop로 쓴다. |
| 3 | The Art of Game Design: A Book of Lenses, Third Edition | https://www.routledge.com/The-Art-of-Game-Design-A-Book-of-Lenses-Third-Edition/Schell/p/book/9781138632059 | agent review 질문 세트를 만드는 lens model로 쓴다. |
| 4 | Rules of Play | https://mitpress.mit.edu/9780262240451/rules-of-play/ | 게임을 system, meaning, interaction, culture로 보는 공통 어휘를 제공한다. |
| 5 | Game Design Pillars: What Are They and How to Practically Apply Them | https://gamedesignskills.com/game-design/design-pillars/ | design pillars를 team alignment 장치로 설명한다. |
| 6 | Player Dynamics Design: Looking Behind the Curtain | https://www.riotgames.com/en/news/player-dynamics-design-looking-behind-the-curtain | player behavior와 social context를 director concern으로 올린다. |
| 7 | Prototype: Building a Game's Substance | https://www.riotgames.com/en/r-and-d-office/prototype-building-a-games-substance | prototype 단계에서 pillars, new player experience, clarity를 검증하는 사례로 쓴다. |
| 8 | Designing Game Feel. A Survey | https://arxiv.org/abs/2011.09201 | game feel을 tuning, juicing, streamlining으로 나눠 experience target에 연결한다. |
| 9 | What is level design | https://book.leveldesignbook.com/introduction | level direction을 공간, 행동, art, psychology, culture의 결합으로 본다. |
| 10 | Metrics | https://book.leveldesignbook.com/process/blockout/metrics | level metrics와 difficulty pacing을 agent-checkable specification으로 바꾼다. |
| 11 | The Art Bible | https://kiwitrek.github.io/ArtBible/ | art bible을 visual consistency와 camera/UI reference 문서로 쓴다. |
| 12 | Art Direction Summit: Building a Visual Identity: An Art Direction Framework | https://www.gdcvault.com/play/1028954/Art-Direction-Summit-Building-a | art pillars, visual identity, technical/marketing constraints를 함께 다룬다. |
| 13 | Art Direction is Not Just Googling Images | https://www.gdcvault.com/play/1020339/Art-Direction- | visual reference가 아니라 meaning, iconography, audience connection을 direction 기준으로 둔다. |
| 14 | Xbox Accessibility Guideline 101: Text display | https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101 | text readability를 game entry, story, objective, communication access로 본다. |
| 15 | Full list - Game Accessibility Guidelines | https://gameaccessibilityguidelines.com/full-list/ | accessibility를 production backlog와 acceptance checklist로 변환한다. |
| 16 | Best Practices for Game Localization | https://igda.org/resources-archive/best-practices-for-game-localization/ | localization, internationalization, culturalization을 creative planning 단계에 넣는다. |
| 17 | Best Practices for Game Localization | https://igda-website.s3.us-east-2.amazonaws.com/wp-content/uploads/2021/04/09142137/Best-Practices-for-Game-Localization-v22.pdf | glossary, style guide, string context, cultural risk를 source-level requirement로 둔다. |
| 18 | Game User Experience And Player-Centered Design | https://link.springer.com/book/10.1007/978-3-030-37643-7 | cognition, player psychology, measurement, production cycle을 UX concern으로 묶는다. |
| 19 | Game UX Mindset: Principles and Methods | https://schedule.gdconf.com/session/game-ux-mindset-principles-and-methods/914314 | perception, attention, memory, onboarding, motivation, game flow를 director review 항목으로 둔다. |
| 20 | GAME WRITING: NARRATIVE SKILLS FOR VIDEOGAMES | https://jswallow.com/book/gwnsvg/ | game writing을 외부 장식이 아니라 production guide로 다룬다. |
| 21 | Inside Interactive Fiction: An Interview with Emily Short | https://www.gamedeveloper.com/design/inside-interactive-fiction-an-interview-with-emily-short | interactive narrative는 goal clarity, pacing, prototypeable interaction에서 출발한다. |
| 22 | Narrative Designer | https://narrativedesigner.com/ | narrative design을 scriptwriting을 넘어 gameplay integration 역할로 본다. |

## Director-Level Framework

### Design Pillars

`Game Design Pillars: What Are They and How to Practically Apply Them`는 design pillar를 여러 사람이 한 게임을 다르게 상상하는 문제의 해법으로 설명한다. director harness에서는 pillar를 feature category가 아니라 rejection rule로 써야 한다.

좋은 pillar는 다음 조건을 만족한다.

- **행동 기준**: agent가 "이 구현은 pillar를 강화하는가"라고 판단할 수 있어야 한다.
- **경험 기준**: "stealth", "story", "combat" 같은 분류보다 "플레이어가 감시받는다고 느낀다"처럼 감각을 말해야 한다.
- **범위 기준**: 할 일을 늘리는 문장이 아니라 버릴 일을 정하는 문장이어야 한다.
- **충돌 기준**: 두 pillar가 충돌할 때 어느 쪽을 우선할지 적어야 한다.

Dream of One 같은 text-danger game에서 pillar는 "텍스트가 위험하다", "NPC와 Station이 player를 조사한다", "player는 investigator가 아니다"처럼 product law에 가까워야 한다. agent에게 "dialogue system을 만들어라"라고 지시하면 일반적인 RPG dialogue가 나올 수 있다. "텍스트 입력과 출력이 exposure risk를 증가시켜야 한다"라고 지시해야 같은 game이 유지된다.

### MDA as Leadership Tool

`MDA: A Formal Approach to Game Design and Game Research`는 Mechanics, Dynamics, Aesthetics를 분리하되 인과적으로 연결한다. 이 framework의 director value는 player-facing 목표와 implementation detail 사이에 번역층을 만든다는 점이다.

Agent 지시에는 다음 순서를 강제한다.

1. **Aesthetics**: 플레이어가 어떤 감각을 받아야 하는가.
2. **Dynamics**: 그 감각이 play 중 어떤 반복 행동, 압박, 의심, 회피에서 생기는가.
3. **Mechanics**: 그 dynamics를 만들기 위해 어떤 rule, state, UI, data가 필요한가.
4. **Evidence**: screenshot, runtime log, smoke test, fixture 중 무엇으로 관찰할 것인가.

MDA는 non-expert director에게 특히 유용하다. "재미있게"나 "긴장감 있게"를 직접 구현하라고 말하지 않고, agent가 mechanics를 제안하기 전에 target dynamics를 제출하게 만들 수 있다.

### Playcentric Design

`Book Excerpt: Game Design Workshop, 5th Edition`는 player experience goals를 정하고 prototype, test, evaluation을 반복하는 playcentric process를 설명한다. Director harness에서는 이 절차가 issue 단위의 완료 조건이 된다.

각 feature request는 다음 네 줄을 가져야 한다.

- **Player experience goal**: 이 작업이 플레이어에게 만들 변화.
- **Prototype surface**: 가장 작은 playable 또는 inspectable surface.
- **Evaluation question**: 확인할 질문 하나.
- **Stop condition**: 목표를 만족하면 더 만들지 않는 기준.

이 구조는 agent가 "좋아 보이는 추가 기능"을 계속 붙이는 문제를 줄인다. Playtest가 없는 경우에도 smoke test, deterministic replay, screenshot evidence, text fixture를 proxy로 삼아야 한다.

### Lenses and Meaningful Play

`The Art of Game Design: A Book of Lenses, Third Edition`는 다양한 관점의 질문을 통해 game을 반복적으로 바라보는 방식을 제공한다. `Rules of Play`는 game design에 필요한 critical vocabulary와 system-level 관점을 제공한다.

Director harness에서는 lens를 agent review prompt로 바꾼다.

- **Player lens**: 이 장면에서 플레이어가 실제로 무엇을 이해하고 무엇을 놓치는가.
- **System lens**: rule이 world behavior로 드러나는가, 아니면 UI 설명에만 머무는가.
- **Theme lens**: mechanic, text, art, level이 같은 theme을 말하는가.
- **Meaning lens**: 선택과 결과가 구별 가능하고 해석 가능한가.
- **Iteration lens**: 다음 playtest에서 무엇을 삭제하거나 좁힐 수 있는가.

Lens는 회의용 질문이 아니라 agent output 평가표다. 같은 patch에 대해 design, narrative, art, UX review agent가 각자 다른 lens로 판단하게 만들 수 있다.

## Discipline Direction

### Game Feel and Experience Targets

`Designing Game Feel. A Survey`는 game feel을 physicality, amplification, support 세 도메인으로 나누고 각각 tuning, juicing, streamlining에 연결한다. Director는 "feel 좋게"라고 말하지 말고 target을 분해해야 한다.

- **Physicality / tuning**: 이동 속도, 카메라 반응, hit pause, input buffer 같은 수치를 조정한다.
- **Amplification / juicing**: 중요한 사건을 sound, animation, text response, screen treatment로 강조한다.
- **Support / streamlining**: 플레이어 의도와 시스템 실행 사이의 마찰을 줄인다.

Dream of One에서는 game feel이 action feel보다 investigation pressure feel에 가깝다. 예를 들어 Station intake 화면은 빠릿한 UI보다 "말을 고르는 동안 노출이 누적된다"는 압박을 줘야 한다. 따라서 target은 "버튼 반응 100ms 이하"만이 아니라 "위험한 선택지가 안전한 선택지처럼 보이지 않는다", "exposure 변화가 즉시 읽힌다"까지 포함해야 한다.

### Narrative Direction

`Narrative Designer`와 `GAME WRITING: NARRATIVE SKILLS FOR VIDEOGAMES`는 narrative를 scriptwriting으로 축소하지 않는다. Narrative direction은 story, interaction, production pipeline이 만나는 지점이다.

`Inside Interactive Fiction: An Interview with Emily Short`는 interactive narrative에서도 명확한 player goal, pacing, interaction prototype이 중요하다는 점을 보여준다. Director harness는 narrative를 다음 산출물로 관리해야 한다.

- **Narrative law**: world가 절대 어기지 않는 규칙.
- **Voice matrix**: NPC, Station, system text의 문체 차이.
- **Stateful consequence**: 문장이 exposure, trust, suspicion, verdict로 이어지는 방식.
- **Scene intent**: 각 scene이 전달할 정보, 압박, 오해, irreversible choice.
- **Forbidden pattern**: player를 investigator로 만들거나 lore exposition을 안전한 보상으로 주는 패턴.

Agent에게 "story 추가"를 맡기면 lore paragraph가 늘어난다. Dream of One에서는 "player text가 evidence가 되는 narrative interaction"처럼 rule과 writing을 함께 지시해야 한다.

### Art Direction

`The Art Bible`은 art bible을 style guide이자 communication tool로 설명한다. `Art Direction Summit: Building a Visual Identity: An Art Direction Framework`는 visual identity가 key art보다 넓고, art pillars와 technical/marketing considerations를 함께 포함한다고 본다. `Art Direction is Not Just Googling Images`는 art direction을 reference image 수집이 아니라 meaning과 iconography 설계로 본다.

Director harness에서 art direction은 다음을 고정한다.

- **Visual pillars**: shape, value, contrast, material, typography, UI density의 기준.
- **Meaning map**: 색, framing, iconography가 어떤 authority, suspicion, exposure를 뜻하는지.
- **Camera rule**: player가 world를 얼마나 통제한다고 느끼는지.
- **Readability rule**: interactable, danger text, verdict state가 즉시 구분되는지.
- **Asset rejection rule**: 예쁘지만 game law를 약하게 만드는 asset을 거절하는 기준.

Dream of One에서는 art direction이 horror moodboard가 되면 안 된다. Station authority, bureaucratic intake, textual danger, surveillance가 visual grammar로 반복되어야 한다.

### Level Direction

`What is level design`은 player 관점에서 level design과 environment art가 분리되지 않는다고 본다. `Metrics`는 player size, movement speed, hallway width, jump distance 같은 수치를 level planning의 기준으로 삼는다.

Director harness에서 level direction은 다음을 포함한다.

- **Behavior route**: 플레이어가 어디로 가고, 멈추고, 읽고, 회피하는지.
- **Information reveal**: text surface, NPC sightline, Station object가 어떤 순서로 보이는지.
- **Spatial pressure**: 안전지대와 노출지대가 어떻게 구분되는지.
- **Metrics**: movement, camera, interaction reach, reading distance, UI scale의 최소값.
- **Blockout proof**: art pass 전에 greybox screenshot과 runtime path evidence를 남긴다.

Agent에게 level을 맡길 때는 "멋진 공간"보다 "player가 무심코 읽은 문장이 evidence로 바뀌는 경로"를 먼저 요구해야 한다.

### UX, Accessibility, and Localization

`Game User Experience And Player-Centered Design`과 `Game UX Mindset: Principles and Methods`는 UX를 UI polish가 아니라 cognition, attention, learning, motivation, flow, ethics로 다룬다. Director는 UX를 creative direction의 하위 실행으로 두지 말고 creative direction 자체의 일부로 다뤄야 한다.

`Xbox Accessibility Guideline 101: Text display`와 `Full list - Game Accessibility Guidelines`는 text readability, contrast, subtitle/caption access, objective reminder, control reminder, interface resize 같은 항목을 game access의 기본으로 둔다. Dream of One은 text가 place where danger starts이므로 accessibility는 선택지가 아니다. 텍스트를 읽을 수 없으면 위험도 경험할 수 없다.

`Best Practices for Game Localization`은 localization을 late translation이 아니라 internationalization, culturalization, testing, style guide, glossary, context sharing으로 본다. Dream of One은 deterministic text semantics가 중요한 게임이므로 localized string도 rule state와 연결되어야 한다.

Director harness의 UX/accessibility/localization 기준은 다음과 같다.

- **Text access is gameplay access**: danger text, subtitle, verdict, objective는 읽기 가능해야 한다.
- **Settings are creative controls**: text size, contrast, speed, replay, volume은 intended experience를 파괴하는 cheat가 아니라 barrier removal이다.
- **String context is required**: speaker, risk state, tone, variable meaning, grammar constraints를 localization key 옆에 둔다.
- **Culturalization is early risk review**: 법, 역사, 종교, 정치, 지역 감수성은 ship 직전 번역 문제가 아니다.
- **UX evidence is visual and behavioral**: screenshot, keyboard-only path, text scale capture, localization fixture를 acceptance로 둔다.

## Agent Prompt Pattern

Director-level prompt는 구현 요청 전에 creative contract를 제공해야 한다.

```text
Vision: [one-sentence player experience]
Pillars: [3-5 rejection-capable principles]
MDA:
- Aesthetics: [target feeling]
- Dynamics: [observable player/system behavior]
- Mechanics: [rules/data/UI needed]
Discipline Constraints:
- Narrative: [voice/law/consequence]
- Art: [visual grammar/readability]
- Level: [route/space/metrics]
- UX/accessibility/localization: [access and text constraints]
Evidence:
- [deterministic checks, screenshots, fixtures]
Do Not:
- [patterns that would make a different game]
```

이 prompt pattern은 agent가 design taste를 추측하지 않게 만든다. 또한 review 단계에서 "요구사항을 구현했는가"보다 "같은 game을 강화했는가"를 물을 수 있게 한다.

## Director Harness Takeaways for Dream of One

- Dream of One의 director harness는 feature backlog보다 먼저 product law를 유지해야 한다.
- "NPCs and Station systems investigate the player"는 narrative, level, UX, evidence semantics 전체의 pillar다.
- "Text is where danger starts"는 UI readability, localization context, accessibility settings까지 지배한다.
- MDA chain은 모든 agent task의 번역층이다. Aesthetics 없는 mechanics는 보류한다.
- Playcentric loop는 deterministic evidence로 대체 가능하다. 단, evidence는 player experience goal과 연결되어야 한다.
- Art direction은 dark mood가 아니라 authority, surveillance, intake, exposure를 읽히게 하는 grammar다.
- Level direction은 공간 장식이 아니라 player가 언제 읽고, 말하고, 들키는지 설계하는 것이다.
- UX/accessibility/localization은 polish가 아니다. Dream Law와 verdict가 텍스트로 작동하는 이상, 접근성과 번역 가능성은 core creative direction이다.
