extends Node
## Localization autoload.
## All player-facing strings are Korean, keyed by content id. Keys are
## registered as a Godot Translation (locale "ko") so tr() resolves, and the
## t()/all_keys() helpers back the localization smoke and the runtime/HUD.
## See docs/tech/godot-2d-client.md (Localization) and docs/game/glossary.md.

const DEFAULT_LOCALE := "ko"

const MESSAGES := {
	"ko": {
		# --- HUD chrome ---
		"hud.title": "스테이션 기록",
		"hud.subtitle": "같은 주문 — 당신의 말과 지연은 기록이 됩니다",
		"hud.prompt.approach": "WASD/방향키로 이동. 상점 카운터의 점원에게 다가가 E로 말을 거세요.",
		"hud.prompt.inspect": "E: 기록물 열람 · 대화 시작",
		"hud.prompt.focus": "E · {target}",
		"hud.conversation.hint": "1 / 2 / 3 선택 · 직접 입력 후 Enter · 오래 침묵하면 지연이 기록됩니다",
		"hud.conversation.input_placeholder": "직접 입력 후 Enter (말은 상점 기록에 남습니다)",
		"hud.conversation.submit": "기록",
		"hud.conversation.recorded_stamp": "기록됨",
		"hud.conversation.hesitation": "응답 지연 기록 중…",
		"hud.timer.seconds": "{seconds}초",
		"hud.pressure.suspicion": "의심",
		"hud.pressure.report": "보고 압박",
		"hud.pressure.reason_updated": "판단 근거 갱신 · Tab에서 열람",
		"hud.status.record_updated": "새 기록 생성 · Tab에서 열람",
		"hud.pressure.latest_ledger": "최근 원장: {line}",
		"hud.pressure.readers": "열람: {readers}",
		"hud.pressure.exchange": "오간 말: {line}",
		"hud.band.low": "관찰 중",
		"hud.band.warning": "보고 직전",
		"hud.band.verdict": "심문 개시",
		"hud.inspect.title": "열람",
		"hud.inspect.record": "기록: {state}",
		"hud.inspect.readers": "열람 가능: {readers}",
		"hud.inspect.current_action": "현재 행동: {action}",
		"hud.inspect.action_source": "행동 출처: {source}",
		"hud.inspect.judgment_reasons": "판단 근거",
		"hud.inspect.causality": "행동 인과",
		"hud.inspect.close": "닫기 (E/Esc)",
		"hud.outcome.restart": "다시 시작 (Enter)",
		"hud.outcome.route": "경로 · {route}",
		"hud.outcome.closing": "마지막 역할 행동 · {actor}: {action}",
		"hud.outcome.cited": "인용된 원장: {ids}",
		"hud.outcome.cited_none": "인용된 원장 없음",
		"hud.ledger.empty": "-",
		"hud.ledger.title": "시민 원장",
		"hud.ledger.open_hint": "Tab: 시민 원장",
		"hud.mode.fixture": "오프라인 기록",
		"hud.mode.http": "실시간 기록",
		"hud.status.action_blocked": "행동 차단 · {tool}",
		"hud.provider.fallback": "대체 기록 전환 · {reason}",
		"hud.provider.fallback_badge": "대체 기록원",
		"hud.settings.title": "설정",
		"hud.settings.resolution": "출력 해상도",
		"hud.settings.ui_scale": "UI 배율",
		"hud.settings.provider": "기록원 연결",
		"hud.settings.close": "닫기 (Esc)",
		"hud.scale.80": "80% · 촘촘하게",
		"hud.scale.100": "100% · 기본",
		"hud.scale.125": "125% · 크게",
		"hud.scale.150": "150% · 아주 크게",
		"hud.debug.active": "디버그 · F3",
		"hud.error.session_start": "세션을 시작하지 못했습니다. 런타임 연결을 확인하세요.",
		"hud.error.answer": "답변을 기록하지 못했습니다. 다시 시도하세요.",

		# --- Locations ---
		"world.location.store": "상점",
		"world.location.station": "스테이션 접수실",
		"world.location.street": "상점 앞 거리",
		"world.doorway.station": "스테이션 접수실로",
		"world.doorway.store": "상점으로",

		# --- Beats / prompts ---
		"beat.store.same_order.routine.prompt": "오늘도 같은 걸로 드릴까요?",
		"beat.store.same_order.probe.prompt": "어제 기록에는 같은 주문이라고 적혀 있습니다. 맞습니까?",
		"beat.station.same_order.reconciliation.prompt": "상점 기록에는 처음 왔다고 답한 뒤, 꿈에 방금 들어왔다고 진술한 기록이 있습니다. 어느 진술을 정정합니까?",

		# --- Choices ---
		"choice.store.same_order.safe": "네, 같은 걸로 부탁해요.",
		"choice.store.same_order.repair": "제가 보통 뭘 시켰죠?",
		"choice.store.same_order.risky": "오늘 처음 왔는데요.",
		"choice.store.same_order.probe.safe": "맞습니다. 제가 착각했습니다.",
		"choice.store.same_order.probe.repair": "어제 일이 조금 흐릿해서 확인했습니다.",
		"choice.store.same_order.probe.risky": "저는 여기 사람이 아닙니다.",
		"choice.station.same_order.reconciliation.safe": "처음 왔다는 답변을 정정합니다. 같은 주문 기록을 따르겠습니다.",
		"choice.station.same_order.reconciliation.repair": "상점 절차를 몰라 확인하려 했습니다. 꿈이라는 표현은 철회합니다.",
		"choice.station.same_order.reconciliation.risky": "둘 다 맞습니다. 저는 여기 사람이 아닙니다.",

		# --- NPC immediate responses ---
		"npcresp.store.same_order.safe": "네. 표식 하나, 같은 봉투로 처리하겠습니다.",
		"npcresp.store.same_order.repair": "보통은 표식 하나라고 하셨죠. 오늘은 왜 확인하시나요?",
		"npcresp.store.same_order.risky": "처음이라고요? 어제도 같은 자리에서 같은 말을 하셨는데요.",
		"npcresp.store.same_order.probe.safe": "그럼 같은 봉투로 두겠습니다.",
		"npcresp.store.same_order.probe.repair": "흐릿하다고요. 기록에는 남겨두겠습니다.",
		"npcresp.store.same_order.probe.risky": "그 말은 그냥 넘길 수 없습니다. 정정표로 남기겠습니다.",
		"npcresp.store.same_order.probe.free": "그 표현은 접수 형식으로 넘기겠습니다.",
		"npcresp.station.same_order.reconciliation.safe": "정정 진술로 접수합니다.",
		"npcresp.station.same_order.reconciliation.repair": "철회 기록을 남깁니다.",
		"npcresp.station.same_order.reconciliation.risky": "두 진술은 같은 기록에 남길 수 없습니다.",

		# --- Free input classifier feedback ---
		"freeinput.recorded": "기록됨",

		# --- Why-lines (per suspicion signal) ---
		"why.clean": "그 답변은 단골 절차와 어긋나지 않았습니다.",
		"why.local_routine_mismatch": "그 말은 점원이 전제한 단골 루틴과 맞지 않습니다.",
		"why.dream_language_leak": "그 말에는 이곳 사람이 쓰지 않는 꿈/바깥 세계 표현이 들어 있습니다.",
		"why.memory_gap_admission": "그 말은 알고 있어야 할 지역 기억이 비어 있음을 인정합니다.",
		"why.role_script_break": "그 말은 평범한 구매 상황의 사회적 대본에서 벗어납니다.",
		"why.prior_statement_contradiction": "그 말은 앞선 대화 기록과 충돌합니다.",
		"why.authority_evasion": "그 말은 직접적인 절차 질문을 피합니다.",
		"why.over_explanation": "그 말은 일상 루틴에 비해 지나치게 길게 해명합니다.",
		"why.response_hesitation": "평범한 주문 질문에서 답변이 늦어져 불확실성 기록으로 남았습니다.",

		# --- Actor labels / roles ---
		"npc.player.label": "당신",
		"npc.player.role": "검사 대상",
		"npc.NPC_Store_Clerk.label": "상점 점원",
		"npc.NPC_Store_Clerk.role": "점원",
		"npc.NPC_Store_Manager.label": "상점 매니저",
		"npc.NPC_Store_Manager.role": "매니저",
		"npc.NPC_Waiting_Customer.label": "대기 손님",
		"npc.NPC_Waiting_Customer.role": "손님",
		"npc.NPC_Station_Officer.label": "스테이션 직원",
		"npc.NPC_Station_Officer.role": "직원",
		"role.player": "플레이어",
		"role.store_clerk": "상점 점원",
		"role.store_manager": "상점 관리자",
		"role.waiting_customer": "대기 손님",
		"role.station_officer": "스테이션 담당관",

		# --- NPC reaction markers ---
		"reaction.calm": "평온",
		"reaction.uneasy": "이상함 감지",
		"reaction.probing": "확인 중",
		"reaction.noted": "메모",
		"reaction.reported": "보고",
		"reaction.paused": "응대 중단",
		"reaction.forwarded": "보고 전달",
		"reaction.cited": "기록 인용",
		"reaction.settled": "정리됨",

		# --- NPC current actions ---
		"action.observe": "주변 관찰",
		"action.look": "기록 확인",
		"action.talk_to": "대화 중",
		"action.use_object": "기록 열람",
		"action.write_record": "기록 작성",
		"action.move_to": "이동 중",
		"action.wait": "대기 중",
		"action.request": "요청 중",
		"action.stop": "행동 멈춤",

		# --- Record props ---
		"prop.store_counter.label": "카운터",
		"prop.store_counter.desc": "상점 카운터. 여기서 당신의 답변이 기록이 됩니다.",
		"prop.usual_order_cue.label": "단골 주문 표식",
		"prop.usual_order_cue.desc": "어제까지의 같은 주문 기록. 점원이 전제하는 루틴입니다.",
		"prop.receipt_tray.label": "영수증 트레이",
		"prop.receipt_tray.desc": "정상 판매가 영수증으로 남는 자리입니다.",
		"prop.correction_slip.label": "정정표",
		"prop.correction_slip.desc": "불확실한 답변에 붙는 정정 기록입니다.",
		"prop.report_tray.label": "보고 트레이",
		"prop.report_tray.desc": "어긋난 말이 상점을 떠나 스테이션으로 향하는 자리입니다.",
		"prop.queue_marker.label": "대기 표식",
		"prop.queue_marker.desc": "이곳이 사적인 대화가 아니라 공개된 절차임을 알립니다.",
		"prop.station_dossier.label": "접수 문서",
		"prop.station_dossier.desc": "스테이션이 상점 기록을 대조해 인용하는 문서입니다.",

		# --- Record prop states ---
		"state.blank": "빈칸",
		"state.normal": "정상",
		"state.marked": "표시됨",
		"state.corrected": "정정됨",
		"state.absent": "없음",
		"state.offered": "제안됨",
		"state.attached": "첨부됨",
		"state.empty": "비어 있음",
		"state.pending": "대기",
		"state.paused": "응대 중단",
		"state.forwarded": "전달됨",
		"state.cited": "인용됨",
		"state.read": "읽힘",
		"state.serving": "응대 중",
		"state.player_waiting": "대기 중",
		"state.settled": "정리됨",

		# --- Ledger event kinds (short label) ---
		"ledger.store_sale_normal": "정상 영수증",
		"ledger.usual_order_cited": "단골 주문 인용",
		"ledger.correction_offered": "정정 제안",
		"ledger.store_sale_corrected": "정정 처리",
		"ledger.store_receipt_marked": "영수증 표시",
		"ledger.store_exception_reported": "상점 보고 접수",
		"ledger.store_report_escalated": "보고 전달",
		"ledger.service_paused": "응대 중단",
		"ledger.station_record_cited": "스테이션 인용",
		"ledger.response_hesitation_noted": "응답 지연 기록",
		"ledger.conversation_started": "대화 시작",
		"ledger.dialogue_choice_selected": "발화 기록",
		"ledger.free_input_recorded": "직접 입력 기록",
		"ledger.npc_suspicion_changed": "점원 의심 변화",
		"ledger.session_started": "세션 시작",

		# --- Route outcomes ---
		"outcome.clean_cover.title": "무사 통과",
		"outcome.clean_cover.body": "당신은 단골 절차대로 답했습니다. 점원은 표식 하나를 같은 봉투로 처리하고 응대를 끝냈습니다. 어떤 보고도 남지 않았습니다.",
		"outcome.repair_recovery.title": "수습",
		"outcome.repair_recovery.body": "당신은 잠시 흔들렸지만 점원의 전제를 받아들여 수습했습니다. 정정표가 남았고 약간의 불신이 기록되었지만, 보고까지 가지는 않았습니다.",
		"outcome.soft_report.title": "약식 보고",
		"outcome.soft_report.body": "쌓인 어긋남을 수습하지 못했습니다. 매니저가 응대를 멈추고 상점 기록을 보고 트레이로 넘겼습니다. 형식적 심문은 아니지만 사회적 마찰이 남습니다.",
		"outcome.hard_inquest.title": "심문",
		"outcome.hard_inquest.body": "당신의 진술이 앞선 상점 기록과 충돌했습니다. 스테이션 직원이 정확한 기록 사슬을 인용하며 심문을 열었고, 세션은 판정으로 잠깁니다.",
		"route.clean_cover": "무사 통과",
		"route.repair_recovery": "수습",
		"route.soft_report": "약식 보고",
		"route.hard_inquest": "심문",
	}
}

var _all_keys: Array[String] = []

func _enter_tree() -> void:
	_register()

func _register() -> void:
	for locale in MESSAGES.keys():
		var translation := Translation.new()
		translation.locale = str(locale)
		var messages: Dictionary = MESSAGES[locale]
		for key in messages.keys():
			translation.add_message(StringName(str(key)), StringName(str(messages[key])))
		TranslationServer.add_translation(translation)
	TranslationServer.set_locale(DEFAULT_LOCALE)
	_all_keys.clear()
	for key in MESSAGES[DEFAULT_LOCALE].keys():
		_all_keys.append(str(key))

## Resolve a content-id key to its localized string, with optional {name} args.
func t(key: String, args: Dictionary = {}) -> String:
	var resolved := str(TranslationServer.translate(StringName(key)))
	if args.is_empty():
		return resolved
	return resolved.format(args)

## True when a key exists in the active locale table.
func has_key(key: String) -> bool:
	return MESSAGES[DEFAULT_LOCALE].has(key)

## Every content-id key (used by the localization smoke).
func all_keys() -> Array[String]:
	return _all_keys.duplicate()

func locale() -> String:
	return DEFAULT_LOCALE
