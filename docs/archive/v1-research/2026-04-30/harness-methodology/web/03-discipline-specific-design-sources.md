# Discipline-Specific Game Design Sources

이 문서는 game harness 설계 기준을 세울 때 참조할 수 있는 분야별 권위 자료를 정리한다. 우선순위는 영어권 자료, 공식 문서, 출판사 페이지, 학회/플랫폼 홀더 문서, 공개 PDF 이다.

## Findings

### Systems Design

**Rules of Play** 는 게임을 규칙, 플레이, 문화의 시스템으로 보는 큰 프레임을 제공한다. Dream of One 에서는 Dream Law, Cover Test, Exposure 같은 deterministic rule layer 와 플레이어가 체감하는 위협 layer 를 분리해 검증하는 기준으로 쓸 수 있다.

**MDA: A Formal Approach to Game Design and Game Research** 는 Mechanics, Dynamics, Aesthetics 를 인과적으로 연결한다. harness 에서는 backend schema, Godot scene state, player-facing text danger 가 서로 다른 층이라는 점을 명시하고, 한 층의 변경이 다른 층으로 어떻게 전파되는지 테스트 항목으로 바꿀 수 있다.

**Game Design Workshop** 은 playcentric design, prototype, playtest, revision 흐름을 강조한다. 단일 기능의 구현 완료보다 player experience goal 이 반복 검증되는지 확인하는 harness 구조에 적합하다.

### Level Design

**The Level Design Book** 은 3D game level design 지식을 엔진 독립적으로 정리한다. Dream of One 의 station shell, intake route, inquest room 같은 공간은 장식 배경이 아니라 시스템이 플레이어를 읽고 압박하는 traversal grammar 로 취급해야 한다.

레벨 검증은 geometry 존재 여부보다 readable affordance, route constraint, sightline, text surface placement 를 본다. 특히 플레이어가 investigator 가 아니라 조사 대상이라는 설계 원칙 때문에, 공간은 탐색 보상보다 노출과 호출 가능성을 조직하는 장치가 된다.

### Encounter/Pacing

**Encounter** 와 **Pacing** 항목은 encounter 를 단일 전투가 아니라 beat, route, enemy/system response 의 조합으로 다룬다. Dream of One 에서는 combat encounter 대신 station intake, cover challenge, inquest exchange, verdict beat 를 encounter 로 취급한다.

**The AI Systems of Left 4 Dead** 는 AI Director 가 difficulty 자체보다 pacing frequency 를 조절하는 사례다. Dream of One 의 harness 는 Exposure 증가, NPC attention, station escalation 을 난이도 숫자로만 보지 말고 intensity curve 와 recovery window 로 기록해야 한다.

### UI/UX

**Game Usability** 와 **Game User Experience And Player-Centered Design** 은 game UX 를 일반 앱 UX 와 분리해 본다. Dream of One 의 UI 는 정보를 친절하게 정리하는 표면이 아니라, 텍스트가 위험해지는 지점이라는 핵심 규칙을 드러내는 interface contract 여야 한다.

검증 기준은 버튼 존재, menu completeness, input reachability 에서 끝나면 안 된다. player intent, system response, uncertainty, consequence visibility 가 UI 상태 전환마다 보존되는지 확인해야 한다.

### Accessibility

**Xbox Accessibility Guidelines** 는 접근성을 아이디어 촉진, 개발 guardrail, test checklist 로 사용하게 설계된 platform-holder 기준이다. **Accessible Player Experiences** 는 access, challenge, presentation barrier 를 팀의 공통 언어로 바꾸는 design pattern 체계다.

Dream of One 에서는 텍스트가 위험해지는 지점이므로 accessibility 는 텍스트를 약화시키는 옵션이 아니다. 대신 clear text, remapping, subtitle/caption structure, readable timing, alternative feedback 을 통해 같은 위험을 더 많은 플레이어가 해석할 수 있게 해야 한다.

### Localization

**Best Practices for Game Localization** 과 Microsoft 의 **Localize games** 문서는 game localization 을 단순 번역이 아니라 context, character, humor, UI constraints, QA 가 결합된 production discipline 으로 다룬다.

Dream of One 은 텍스트가 product authority 이므로 localization kit 에 speaker, legal/status meaning, exposure implication, variable constraints 를 포함해야 한다. 번역 문자열은 backend deterministic validation 과 분리되지 않아야 하며, localization QA 는 의미 보존과 layout failure 를 동시에 확인해야 한다.

### Art Direction

**Art Direction Summit: Building a Visual Identity: An Art Direction Framework** 는 art direction 을 key art 가 아니라 art pillars, visual identity, technical/production/marketing constraints 의 결합으로 다룬다. 이 관점은 Dream of One 의 art direction 을 fidelity 경쟁이 아니라 product rule 을 보이게 하는 visual hierarchy 로 고정한다.

Station systems, signage, paperwork, verdict surfaces, NPC posture 는 같은 시각 언어를 공유해야 한다. 좋은 asset 보다 중요한 것은 플레이어가 "이 세계가 나를 기록한다"는 방향성을 반복적으로 읽는 것이다.

### Audio

**Wwise** 문서는 game audio, music, motion 을 시각 개발과 병행하는 production pipeline 으로 설명한다. **Game Audio Programming** 은 sound designer 와 audio programmer 의 협업, runtime audio systems, shipped-game techniques 를 강조한다.

Dream of One 의 audio harness 는 음악 재생 여부보다 state-bound audio cue 를 검증해야 한다. intake call, attention shift, exposure rise, verdict lock 같은 deterministic event 가 audible affordance 와 충돌 없이 연결되는지 확인한다.

### Game Feel

**Game Feel** 은 moment-to-moment control sensation 을 game design 의 숨은 언어로 다룬다. **Designing Game Feel. A Survey** 는 game feel 을 physicality, amplification, support 로 나누고 tuning, juicing, streamlining 을 설계 행위로 정리한다.

Dream of One 은 액션 게임이 아니어도 game feel 이 필요하다. 입력 반응, text reveal timing, camera stability, NPC attention feedback, irreversible verdict transition 이 플레이어에게 조작 가능성과 피조사 감각을 동시에 전달해야 한다.

### Playtesting

**Games User Research** 는 playtest, lab setup, survey, interview, observation, RITE, analytics, biometric methods 를 production discipline 으로 묶는다. **Game Design Workshop** 은 prototype, playtest, revise 의 반복을 설계 교육의 중심에 둔다.

Dream of One 의 playtest 는 "재미있었는가"보다 "플레이어가 자신이 조사 대상임을 언제 이해했는가", "어떤 텍스트를 위험으로 해석했는가", "verdict 가 임의가 아니라 deterministic consequence 로 읽혔는가"를 묻는다.

## Source Map

| Discipline | Source Title | Scope | URL |
|---|---|---|---|
| Systems Design | Rules of Play | Game design theory, systems, interactivity, meaning. | https://mitpress.mit.edu/9780262240451/rules-of-play/ |
| Systems Design | MDA: A Formal Approach to Game Design and Game Research | Mechanics, Dynamics, Aesthetics framework. | https://www.cs.northwestern.edu/~hunicke/MDA.pdf |
| Systems Design / Playtesting | Game Design Workshop | Playcentric design, prototyping, playtesting, revision. | https://www.gamedesignworkshop.com/ |
| Level Design | The Level Design Book | Broad 3D level design reference. | https://book.leveldesignbook.com/ |
| Encounter/Pacing | Encounter | Encounter design as systemic beat structure. | https://book.leveldesignbook.com/process/combat/encounter |
| Encounter/Pacing | Pacing | Beat sheets, critical path, intensity graph, pacing docs. | https://book.leveldesignbook.com/process/preproduction/pacing |
| Encounter/Pacing | The AI Systems of Left 4 Dead | Valve AI Director, adaptive dramatic pacing. | https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf |
| UI/UX | Game Usability | Game UX strategy, usability, player differences, inclusion. | https://www.routledge.com/Game-Usability-Advice-from-the-Experts-for-Advancing-UX-Strategy-and-Practice-in-Videogames/Isbister-Hodent/p/book/9780367619923 |
| UI/UX | Game User Experience And Player-Centered Design | Game UX, player psychology, measurement, case studies. | https://link.springer.com/book/10.1007/978-3-030-37643-7 |
| Accessibility | Xbox Accessibility Guidelines | Platform-holder accessibility best practices and test guidance. | https://learn.microsoft.com/en-us/gaming/accessibility/guidelines |
| Accessibility | Accessible Player Experiences | AbleGamers accessibility design patterns. | https://accessible.games/accessible-player-experiences/ |
| Localization | Best Practices for Game Localization | IGDA LocSIG game localization guide. | https://igda-website.s3.us-east-2.amazonaws.com/wp-content/uploads/2021/04/09142137/Best-Practices-for-Game-Localization-v22.pdf |
| Localization | Localize games | Microsoft globalization guidance for video game localization context. | https://learn.microsoft.com/en-us/globalization/localization/localize-games |
| Localization | Localization and globalization overview | Microsoft GDK package and in-title localization overview. | https://learn.microsoft.com/en-us/gaming/gdk/docs/gdk-dev/game-principles/localization/localization_overview |
| Art Direction | Art Direction Summit: Building a Visual Identity: An Art Direction Framework | GDC talk page for visual identity and art pillars. | https://www.gdcvault.com/play/1028954/Art-Direction-Summit-Building-a |
| Art Direction | Building a Unique Visual Identity | GDC 2023 slide PDF for art direction framework. | https://media.gdcvault.com/gdc2023/Slides/BuildingAUnique_Routhier_Genevieve.pdf |
| Audio | Wwise 2025.1.4 Documentation | Official interactive audio authoring and runtime documentation. | https://www.audiokinetic.com/en/public-library/2025.1.4_9062/?source=Help&id=welcome_to_wwise |
| Audio | Game Audio Programming | Game audio programming principles and production practice. | https://www.routledge.com/Game-Audio-Programming-Principles-and-Practices/Somberg/p/book/9780367658342 |
| Game Feel | Game Feel | Virtual sensation, control feel, feedback, sound, indicators. | https://www.routledge.com/Game-Feel-A-Game-Designers-Guide-to-Virtual-Sensation/Swink/p/book/9780123743282 |
| Game Feel | Designing Game Feel. A Survey | Academic survey of game feel research and practitioner vocabulary. | https://arxiv.org/abs/2011.09201 |
| Playtesting | Games User Research | OUP reference for GUR process, methods, reporting, analytics. | https://academic.oup.com/book/26677 |
| Playtesting | Playtesting Best Practices | Practical playtesting process and iteration reference. | https://www.routledge.com/Playtesting-Best-Practices-Real-World-and-Online/Backe/p/book/9781032813486 |

## Game Harness Takeaways for Dream of One

- Harness 는 discipline 별 pass/fail 을 한 화면에 모으되, source authority 는 backend deterministic semantics 에 둔다.
- Systems design 검증은 Mechanics, Dynamics, Aesthetics 간 전파를 확인한다.
- Level, encounter, pacing 검증은 station beat 가 player investigation fantasy 로 미끄러지지 않는지 본다.
- UI/UX 와 accessibility 검증은 텍스트 위험을 제거하지 않고 읽을 수 있게 만든다.
- Localization 검증은 번역 품질과 deterministic consequence 보존을 같은 gate 로 묶는다.
- Art, audio, game feel 검증은 polish 가 아니라 system legibility 를 기준으로 삼는다.
- Playtesting 질문은 enjoyment 보다 player interpretation, perceived agency, verdict causality 를 추적한다.
