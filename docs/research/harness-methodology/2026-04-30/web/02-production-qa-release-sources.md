# Production, QA, and Release Source Notes

이 문서는 game harness 방법론에 연결할 production, QA, release 근거를 모은 웹 리서치 메모다. 우선순위는 영어권 단행본, 공식 publisher page, IGDA, GDC, 공식 플랫폼 문서, 공공 funding guide 순서로 두었다.

## Source Map

| ID | Source Title | Authority Type | Use Area | URL |
|---|---|---|---|---|
| S01 | The Game Production Toolbox | CRC Press / Routledge book page | production lifecycle, pitch, team, QA, release | https://www.routledge.com/The-Game-Production-Toolbox/Chandler/p/book/9781138341708 |
| S02 | A Playful Production Process | MIT Press book page | phase model, milestones, deliverables, anti-crunch process | https://mitpress.mit.edu/9780262045513/a-playful-production-process/ |
| S03 | The Game Production Handbook, 3rd Edition | Jones & Bartlett Learning via O'Reilly catalog | roles, project management, publisher pitch, testing plan | https://www.oreilly.com/library/view/the-game-production/9781449688097/ |
| S04 | Agile Practice Guide | Project Management Institute / Agile Alliance | uncertainty, adaptive planning, empirical measures | https://www.pmi.org/standards/agile |
| S05 | IGDA Game Crediting Guidelines 10.1 | IGDA official PDF | team roles, credit policy, preproduction governance | https://igda.org/wp-content/uploads/2021/11/IGDA-Game-Crediting-Guidelines-10.1-March-2023.pdf |
| S06 | The Vertical Slice Challenge | GDC Vault | vertical slice as production-readiness gate | https://gdcvault.com/play/1022329/The-Vertical-Slice |
| S07 | Prototype Fund | UK Games Fund | funding readiness, pitch evidence, route to market | https://www.ukgamesfund.com/prototype-fund/ |
| S08 | Ukie Access to Finance Guide 2025 | Ukie official PDF | grant/investment readiness, audience and funding rationale | https://cms.ukie.org.uk/wp-content/uploads/2025/04/Ukie-Access-to-Finance-Guide-2025-PDF.pdf |
| S09 | How to Pitch Your Game to Indie Fund (or just about anyone) | Indie Fund | investor evaluation, vertical slice, budget/schedule fit | https://indie-fund.com/articles/How-to-Pitch-Your-Game-to-Indie-Fund-or-just-about-anyone |
| S10 | Release Process | Steamworks Documentation | store/build checklist, release sequence | https://partner.steamgames.com/doc/store/releasing |
| S11 | Review Process | Steamworks Documentation | platform review, build/store QA expectations | https://partner.steamgames.com/doc/store/review_process?language=english |
| S12 | GDC 2025: How to Ensure a Successful Xbox Game Launch | Microsoft Game Dev | certification, launch stability, pencils-down discipline | https://developer.microsoft.com/en-us/games/articles/2025/03/gdc-2025-how-to-ensure-a-successful-game-launch/ |
| S13 | Unlocking Access to Game Publishing Documentation for All Developers | Microsoft Game Dev | public publishing guide, launch configuration, certification | https://developer.microsoft.com/en-us/games/articles/2025/11/unlocking-access-to-game-publishing-documentation-for-all-developers/ |
| S14 | Best Practices in Quality Assurance and Testing | IGDA official PDF | QA process, automation, TRC/platform standards | https://igda-website.s3.us-east-2.amazonaws.com/wp-content/uploads/2019/10/15004958/IGDA_Best_Practices_QA_0.pdf |
| S15 | 'Horizon Zero Dawn': A QA Open World Case Study | GDC Vault | embedded QA, risk strategy, telemetry, post-launch support | https://www.gdcvault.com/play/1025326/-Horizon-Zero-Dawn-A |
| S16 | Continuous Testing | GDC Vault | QA engineering, instrumentation, reporting | https://www.gdcvault.com/play/1021881/Continuous |
| S17 | A Survey of the Modern QA Department | GDC Vault | small/mid studio QA setup, tools, budget, staffing | https://www.gdcvault.com/play/1020008/A-Survey-of-the-Modern |
| S18 | Game Testing: All in One | Mercury Learning and Information book page | test design, QA roles, quality measurements | https://sciendo.com/book/9781683922858 |

## Findings

### Production lifecycle and phase gates

**The Game Production Toolbox**는 concept부터 player release까지 이어지는 실무 production 범위를 한 권으로 묶는다. 목차가 prototype, requirements, schedule, budget, pitching, team organization, outsourcing, execution, UX, audio, localization, QA testing, release로 이어져서 harness가 추적할 산출물을 phase별로 나누기에 적합하다.

**A Playful Production Process**는 ideation부터 post-production까지 단계별 활동, milestone, deliverable을 명시하는 book-level source다. 이 출처는 game harness가 “작업이 끝났다”를 감각적 판단이 아니라 phase deliverable로 판정해야 한다는 근거를 준다.

**The Game Production Handbook, 3rd Edition**는 preproduction, production plan, testing plan, postproduction checklist를 같은 lifecycle 안에 둔다. 특히 roles, project management methods, developer-publisher relationship, financing, third-party approvals를 함께 다루므로 production harness의 gate가 코드 완료만 보지 않아야 한다는 근거로 쓸 수 있다.

**Agile Practice Guide**는 게임처럼 불확실성이 높은 작업을 adaptive planning, team composition, empirical measurement로 다루는 일반 project management 근거다. 게임 production에서는 fixed master plan보다 phase gate와 반복 검증을 결합하는 hybrid 운영이 더 현실적이다.

### Team roles and governance

**IGDA Game Crediting Guidelines 10.1**는 역할을 credit과 career record의 문제로 다룬다. pre-production에서 crediting approach와 rules를 정하라는 권고는, 소규모 팀도 역할과 책임을 늦게 정하면 release 직전에 governance 문제가 된다는 신호다.

**The Game Production Handbook, 3rd Edition**의 roles chapter는 production, art, engineering, design, audio, QA, marketing/PR를 별도 discipline으로 본다. Dream of One의 harness는 구현자 중심 체크리스트가 아니라 design authority, runtime authority, QA authority, release authority를 분리해야 한다.

**The Game Production Toolbox**도 hiring, team organization, managing team, outsourcing을 독립 part로 둔다. 이는 indie 팀이라도 누가 어떤 gate를 승인하는지, 외주나 contributor가 어느 산출물에 책임지는지 명시해야 함을 뒷받침한다.

### Vertical slice and milestone gates

**The Vertical Slice Challenge**는 vertical slice를 pre-production에서 production으로 넘어갈 준비가 됐는지 판단하는 gate로 설명한다. 이 gate는 내부 목표와 외부 목표를 동시에 만족해야 하며, 팀이 무엇을 만들고 어떻게 만들지 이해했는지를 보여준다.

**A Playful Production Process**는 milestone과 deliverable을 phase boundary에 연결한다. harness 관점에서 vertical slice는 “demo”가 아니라 content pipeline, interaction loop, quality bar, schedule estimate를 동시에 검증하는 production readiness test다.

**Indie Fund**는 playable prototype 또는 vertical slice가 mechanics, art, audio, budget, schedule을 함께 보여줄 수 있다고 본다. funding pitch에서 slice는 감상용 트레일러가 아니라 실행 가능성과 scope sanity를 증명하는 evidence다.

### Funding and pitch readiness

**UK Games Fund Prototype Fund**는 funding readiness를 market opportunity, competitor differentiation, external feedback, publisher/player/showcase validation, route to market, team experience로 본다. pitch video도 trailer가 아니라 team, game, gameplay/concept art, route to market을 보강하는 tailored evidence여야 한다.

**Ukie Access to Finance Guide 2025**는 commercial audience, audience access plan, funding rationale, eligible cost, additionality를 요구한다. grant나 investment 문맥에서 “좋은 아이디어”보다 target audience, cost logic, funding use, studio growth effect가 더 중요한 평가 표면이다.

**How to Pitch Your Game to Indie Fund (or just about anyone)**는 투자 검토 질문을 네 가지로 압축한다. 게임이 흥미롭고 잘 만들어졌는지, 팀이 목표를 달성할 수 있는지, 투자금 회수가 가능한지, budget/schedule이 financial success와 맞는지가 핵심이다.

### Release planning and platform gates

**Steamworks Release Process**는 release를 store presence checklist와 game build checklist로 분리한다. store page review가 build review보다 먼저 필요하며, build는 store page에 약속한 기능을 포함한 mostly final build여야 한다.

**Steamworks Review Process**는 store page가 launch 시점에 제공되지 않는 기능을 약속하면 안 된다고 명시한다. screenshots는 gameplay 기반이어야 하며, product build는 지원 OS에서 실행되고 store page에 표시한 기능을 구현해야 한다.

**GDC 2025: How to Ensure a Successful Xbox Game Launch**는 certification 실패의 흔한 원인을 stability, crash, hang, long loading, gameplay/save issues로 든다. release candidate는 certification을 통과한 known good build로 고정하고, launch 직전 사소한 수정 때문에 untested build를 내보내지 않는 pencils-down gate가 필요하다.

**Unlocking Access to Game Publishing Documentation for All Developers**는 Xbox publishing guidance가 sign up부터 release까지 공개 범위를 넓혔다고 설명한다. wish list, pre-order, release configuration, Xbox Insider playtest, certification and test services는 release planning을 production 후반이 아니라 production 중반부터 다뤄야 하는 항목이다.

### QA strategy

**Best Practices in Quality Assurance and Testing**는 QA를 bug finding/reporting만이 아니라 publisher와 developer가 product quality를 지키기 위해 협업하는 process로 다룬다. automation은 human testing을 대체하기보다 반복적이거나 찾기 어려운 defect를 보강하는 방식으로 써야 한다.

**Best Practices in Quality Assurance and Testing**는 TRC 같은 platform standards를 전문적으로 다루는 담당자가 있으면 certification 재제출 위험을 줄일 수 있다고 본다. Dream of One이 PC-first라도 store contract, save/load, input, localization, content disclosure 같은 release standards를 별도 checklist로 둬야 한다.

**'Horizon Zero Dawn': A QA Open World Case Study**는 QA의 early engagement, communication, trust, agile collaboration, risk management, test strategy, tools, telemetry, post-launch support를 강조한다. QA는 production 끝의 검사자가 아니라 risk를 일찍 발견하는 embedded function이다.

**Continuous Testing**는 large-scale live game에서 QA engineering, instrumentation, automated execution infrastructure, audience-specific reporting을 다룬다. harness는 수동 smoke test만 저장하지 말고, 자동 evidence run과 사람이 읽는 report를 연결해야 한다.

**A Survey of the Modern QA Department**는 small- to medium-sized studio가 QA를 시작할 때 무엇을 하고, 어떤 tools를 쓰고, 어떻게 staff/budget/dev-test interaction을 설계할지 다룬다. 작은 팀에서는 QA department를 그대로 복제하기보다 QA responsibility, bug triage, test coverage, release blocker 권한을 가볍게 명시하는 것이 맞다.

**Game Testing: All in One**는 test design, QA roles/responsibilities, quality and testing progress measurement를 다루는 English QA book source다. harness에는 bug count보다 blocker severity, regression coverage, reproducibility, platform-specific failure class가 더 유용한 quality signal이다.

## Cross-Source Synthesis

Production source들은 공통적으로 game development를 phase, role, milestone, deliverable의 조합으로 본다. Prototype은 idea risk를 줄이고, vertical slice는 production readiness를 증명하며, alpha/beta/release candidate는 completion과 stability를 분리한다.

Funding source들은 pitch readiness를 narrative quality보다 evidence quality로 본다. 필요한 evidence는 playable proof, team capability, market/audience understanding, realistic scope, budget/schedule fit, route to market이다.

Platform source들은 release readiness를 marketing page와 executable build의 정합성으로 본다. 공개 문구, screenshots, feature flags, supported OS, save stability, certification status가 서로 맞지 않으면 release risk가 된다.

QA source들은 QA를 final bug sweep로 축소하지 않는다. QA는 early risk discovery, standards compliance, telemetry, automation, regression, post-launch support까지 포함하는 production discipline이다.

## Game Harness Takeaways for Dream of One

- **Gate를 phase별로 둔다**: prototype, vertical slice, alpha, beta, release candidate, launch, post-launch를 같은 “done”으로 취급하지 않는다.
- **Vertical slice는 product authority gate다**: core loop, text danger surface, Station investigation flow, deterministic Evidence semantics, content pipeline, QA evidence를 한 번에 검증한다.
- **Pitch readiness는 playable evidence 중심이다**: route to market, audience, team capacity, budget/schedule, external feedback을 source-backed checklist로 만든다.
- **QA는 early embedded function이다**: runtime smoke, scene load, evidence run, backend schema check, regression notes를 milestone마다 붙인다.
- **Release gate는 store promise와 build truth를 맞춘다**: store copy, screenshots, feature claims, supported platforms, save/load, content disclosure가 실제 build와 일치해야 한다.
- **Pencils-down policy를 둔다**: release candidate 이후에는 blocker fix 외 변경을 제한하고, 변경된 build는 다시 evidence run을 통과해야 한다.
