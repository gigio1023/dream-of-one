class_name LocalizationManager
extends Node

signal locale_changed(locale: String)

const DEFAULT_LOCALE := "ko"
const SUPPORTED_LOCALES: Array[String] = ["ko", "en"]

static var _translations_registered := false

const MESSAGES := {
	"ko": {
		"language.korean": "한국어",
		"language.english": "English",
		"hud.language": "언어",
		"hud.stage": "단계: {stage}",
		"hud.exposure": "노출도: {exposure} / 100",
		"hud.station": "스테이션: 접수 {intake} | 심문 {inquest} | 판정 {verdict} | 종료 {termination}",
		"hud.station_compact": "접수 {intake} | 심문 {inquest} | 판정 {verdict} | 종료 {termination}",
		"hud.evidence": "증거",
		"hud.choices": "1/2/3 대화 선택지   직접 입력은 상점 기록",
		"state.open": "열림",
		"state.closed": "닫힘",
		"stage.ambient": "대기",
		"stage.report": "보고",
		"stage.intake": "접수",
		"stage.normal": "평상",
		"stage.uneasy": "불안",
		"stage.probing": "확인 질문",
		"stage.shared": "공유",
		"stage.reported": "보고됨",
		"stage.inquest": "심문",
		"stage.verdict": "판정",
		"objective.verdict": "판정 준비 완료. why-line 증거를 확인하세요. R로 다시 시작하거나 Q로 종료하세요.",
		"objective.inquest": "심문이 열렸습니다. 스테이션에서는 절차형 답변만 사용하세요.",
		"objective.intake": "스테이션 접수가 열렸습니다. 보고 데스크를 찾고 답변의 일관성을 유지하세요.",
		"objective.read_rule": "상점 카운터에서 점원과 대화하세요. 말이 기록이 될 수 있습니다.",
		"objective.enter_cover_test": "상점 점원의 질문에 대화 선택지로 답하세요.",
		"prompt.default": "WASD로 이동. 방향키로 시점 전환. 상점 카운터나 규칙 게시판에 접근하세요.",
		"prompt.read_surface": "E를 눌러 {surface} 읽기.",
		"prompt.cover_test": "커버 테스트 {coverTest}: 1 절차대로 답하기, 2 절차 묻기, 3 맥락 맞추기, 4 커버 깨기.",
		"notice.opening.title": "시작 절차",
		"notice.opening.body": "규칙 안내를 읽으세요. 그다음 커버 테스트 구역에 들어가 답변을 절차적으로 유지하세요.",
		"notice.no_focus.title": "초점 없음",
		"notice.no_focus.body": "범위 안에 읽을 수 있는 규칙이나 커버 테스트 구역이 없습니다.",
		"notice.text_surface.body": "{body}\n꿈의 법: {law}\n커버 테스트: {coverTest}",
		"notice.cover_test.body": "{prompt}\n1 절차대로 답하기, 2 절차 묻기, 3 맥락 맞추기, 4 커버 깨기.",
		"notice.no_cover_test.title": "커버 테스트 없음",
		"notice.no_cover_test.body": "초점이 맞은 커버 테스트 구역이 없어 발화 선택을 무시했습니다.",
		"notice.speech.body": "{pressure}\n발화 행동: {speechAct}\n노출도: {before} -> {after}",
		"outcome.verdict.title": "판정 준비 완료",
		"outcome.verdict.body": "스테이션은 세션을 닫을 만큼의 절차 증거를 확보했습니다.\n마지막 why-line: {pressure}\nR 다시 시작 / Q 종료",
		"event.session_started": "상점 근처에서 대화 프롤로그가 시작되었습니다. 점원의 평범한 질문에 답하세요.",
		"event.no_focus": "범위 안에 읽을 수 있는 규칙이나 커버 테스트 구역이 없습니다.",
		"event.text_surface_read": "{surface}을(를) 읽었습니다. 꿈의 법 {law}이(가) 플레이어 대면 증거에 추가되었습니다.",
		"event.cover_test_focused": "{coverTest}에 초점을 맞췄습니다. 제한된 발화 행동을 선택하세요.",
		"event.speech_without_cover_test": "초점이 맞은 커버 테스트 구역이 없어 발화 선택을 무시했습니다.",
		"event.cover_test_defused": "{coverTest}에서 {speechAct} 사용: 노출도 {delta} -> {exposure}. 절차적 발화로 커버를 유지했습니다.",
		"event.cover_test_pressure": "{coverTest}에서 {speechAct} 사용: 노출도 +{delta} -> {exposure}. 결정론적 why-line과 함께 압박이 상승했습니다.",
		"event.station_intake_open": " 스테이션 접수가 열렸습니다.",
		"event.inquest_open": " 심문이 열렸습니다.",
		"event.verdict_ready": " 판정 준비가 완료되었습니다.",
		"cover.CT_STORE_QUEUE_LANGUAGE.title": "상점 대기열 테스트",
		"cover.CT_STORE_QUEUE_LANGUAGE.prompt": "서비스를 요청하기 전에 물품 수를 말하고 라벨을 확인하세요.",
		"cover.CT_STORE_QUEUE_LANGUAGE.defuse": "물품 수가 제출되고 라벨이 확인되었습니다. 대기열 압박이 내려갑니다.",
		"cover.CT_STORE_QUEUE_LANGUAGE.pressure": "점원이 대기열 불일치를 기록하고 절차를 다시 말하라고 요구합니다.",
		"cover.CT_STUDIO_APPROVAL_GATE_SPEECH.title": "스튜디오 승인 테스트",
		"cover.CT_STUDIO_APPROVAL_GATE_SPEECH.prompt": "승인 요청에는 출처, 소유자, 이유가 필요합니다.",
		"cover.CT_STUDIO_APPROVAL_GATE_SPEECH.defuse": "출처, 소유자, 이유가 승인되었습니다.",
		"cover.CT_STUDIO_APPROVAL_GATE_SPEECH.pressure": "PM이 불완전한 승인 요청을 기록합니다.",
		"cover.CT_PARK_OBSERVATION_PRESSURE.title": "공원 관찰 테스트",
		"cover.CT_PARK_OBSERVATION_PRESSURE.prompt": "공적 흐름 안에 머무르세요. 꿈 상태를 서술하지 마세요.",
		"cover.CT_PARK_OBSERVATION_PRESSURE.defuse": "관찰이 공적 흐름 언어로 돌아왔습니다.",
		"cover.CT_PARK_OBSERVATION_PRESSURE.pressure": "목격자가 공적 흐름 밖의 언어를 기록합니다.",
		"cover.CT_STATION_SOFT_INQUEST.title": "스테이션 소프트 심문",
		"cover.CT_STATION_SOFT_INQUEST.prompt": "절차 질문에만 답하고 내부 일관성을 유지하세요.",
		"cover.CT_STATION_SOFT_INQUEST.defuse": "절차적 답변이 접수되었습니다.",
		"cover.CT_STATION_SOFT_INQUEST.pressure": "담당자가 절차 불일치 노트를 엽니다.",
		"speech.SA_COMPLY.label": "절차대로 답하기",
		"speech.SA_INQUIRE.label": "절차 묻기",
		"speech.SA_FRAME.label": "맥락 맞추기",
		"speech.SA_BREAK.label": "커버 깨기",
		"npc.NPC_Store_Clerk.label": "상점 점원",
		"npc.NPC_Store_Clerk.role": "상점 점원",
		"npc.NPC_Studio_PM.label": "스튜디오 PM",
		"npc.NPC_Studio_PM.role": "스튜디오 PM",
		"npc.NPC_Park_Witness.label": "공원 목격자",
		"npc.NPC_Park_Witness.role": "공원 목격자",
		"npc.NPC_Station_Officer.label": "스테이션 담당자",
		"npc.NPC_Station_Officer.role": "스테이션 담당자",
		"npc.reaction.uneasy": "이상함 감지",
		"npc.reaction.probing": "확인 중",
		"npc.reaction.reported": "보고됨",
		"text_surface.TS_Store_QueueRules.label": "대기열 규칙",
		"text_surface.TS_Store_QueueRules.body": "상점 절차: 같은 주문이면 그대로 답하세요. 헷갈리면 정정표가 붙고, 어긋난 말은 보고 트레이로 넘어갑니다. 스테이션은 전달된 상점 기록만 인용합니다.",
		"text_surface.TS_Studio_ApprovalCriteria.label": "승인 기준",
		"text_surface.TS_Studio_ApprovalCriteria.body": "승인 기준: 검토를 요청하기 전에 출처, 소유자, 이유를 말하세요.",
		"text_surface.TS_Park_NoticeBoard.label": "공지 게시판",
		"text_surface.TS_Park_NoticeBoard.body": "관찰 공지: 공적 흐름 안에 머무르고 꿈 상태를 서술하지 마세요.",
		"text_surface.TS_Station_IntakeRules.label": "접수 규칙",
		"text_surface.TS_Station_IntakeRules.body": "스테이션 접수: 설명보다 절차 답변이 우선입니다. 담당자는 상점 영수증, 보고 트레이, 장부 번호를 대조해 어떤 진술을 유지할지 묻습니다.",
		"landmark.Store.label": "상점",
		"landmark.Store.hint": "대기열 발화만 허용",
		"landmark.Studio.label": "스튜디오",
		"landmark.Studio.hint": "출처, 소유자, 이유",
		"landmark.Park.label": "공원",
		"landmark.Park.hint": "공적 흐름",
		"landmark.Station.label": "스테이션",
		"landmark.Station.hint": "절차 접수",
		"label.two_lines": "{line1}\n{line2}",
		"zone.conversation": "대화\nSame Order",
		"zone.cover_test": "커버 테스트\n{coverTest}"
	},
	"en": {
		"language.korean": "한국어",
		"language.english": "English",
		"hud.language": "Language",
		"hud.stage": "Stage: {stage}",
		"hud.exposure": "Exposure: {exposure} / 100",
		"hud.station": "Station: intake {intake} | inquest {inquest} | verdict {verdict} | termination {termination}",
		"hud.station_compact": "Intake {intake} | Inquest {inquest} | Verdict {verdict} | End {termination}",
		"hud.evidence": "Evidence",
		"hud.choices": "1/2/3 dialogue choices   typed speech becomes a Store record",
		"state.open": "open",
		"state.closed": "closed",
		"stage.ambient": "ambient",
		"stage.report": "report",
		"stage.intake": "intake",
		"stage.normal": "normal",
		"stage.uneasy": "uneasy",
		"stage.probing": "probing",
		"stage.shared": "shared",
		"stage.reported": "reported",
		"stage.inquest": "inquest",
		"stage.verdict": "verdict",
		"objective.verdict": "Verdict ready. Review the why-line Evidence. Press R to restart or Q to quit.",
		"objective.inquest": "Inquest open. Use procedural answers only at Station.",
		"objective.intake": "Station intake open. Find the report desk and keep answers consistent.",
		"objective.read_rule": "Talk to the Store Clerk. Speech can become evidence.",
		"objective.enter_cover_test": "Answer the clerk through dialogue choices.",
		"prompt.default": "Move with WASD. Use arrow keys to look. Approach the store counter or a rule board.",
		"prompt.read_surface": "Press E to read {surface}.",
		"prompt.cover_test": "Cover Test {coverTest}: press 1 comply, 2 inquire, 3 frame, 4 break.",
		"notice.opening.title": "Opening Procedure",
		"notice.opening.body": "Read the rule notice. Then enter a Cover Test zone and keep the answer procedural.",
		"notice.no_focus.title": "No Focus",
		"notice.no_focus.body": "No readable rule or Cover Test zone is in range.",
		"notice.text_surface.body": "{body}\nDream Law: {law}\nCover Test: {coverTest}",
		"notice.cover_test.body": "{prompt}\n1 comply, 2 inquire, 3 frame, 4 break.",
		"notice.no_cover_test.title": "No Cover Test",
		"notice.no_cover_test.body": "Speech choice ignored because no Cover Test zone is focused.",
		"notice.speech.body": "{pressure}\nSpeech act: {speechAct}\nExposure: {before} -> {after}",
		"outcome.verdict.title": "VERDICT READY",
		"outcome.verdict.body": "The Station has enough procedural evidence to close the session.\nLast why-line: {pressure}\nR restart / Q quit",
		"event.session_started": "Conversation prologue started near the Store. Answer the clerk's ordinary question.",
		"event.no_focus": "No readable rule or Cover Test zone is in range.",
		"event.text_surface_read": "Read {surface}; Dream Law {law} is now in player-facing evidence.",
		"event.cover_test_focused": "Focused {coverTest}. Choose a bounded speech act.",
		"event.speech_without_cover_test": "Speech choice ignored because no Cover Test zone is focused.",
		"event.cover_test_defused": "{coverTest} used {speechAct}: Exposure {delta} -> {exposure}. Cover held through procedural speech.",
		"event.cover_test_pressure": "{coverTest} used {speechAct}: Exposure +{delta} -> {exposure}. Pressure escalated with deterministic why-line.",
		"event.station_intake_open": " Station intake is open.",
		"event.inquest_open": " Inquest is open.",
		"event.verdict_ready": " Verdict is ready.",
		"cover.CT_STORE_QUEUE_LANGUAGE.title": "Store Queue Test",
		"cover.CT_STORE_QUEUE_LANGUAGE.prompt": "State item count and confirm the label before asking for service.",
		"cover.CT_STORE_QUEUE_LANGUAGE.defuse": "Item count stated. Label confirmed. Queue pressure drops.",
		"cover.CT_STORE_QUEUE_LANGUAGE.pressure": "The clerk marks a queue mismatch and asks you to repeat the procedure.",
		"cover.CT_STUDIO_APPROVAL_GATE_SPEECH.title": "Studio Approval Test",
		"cover.CT_STUDIO_APPROVAL_GATE_SPEECH.prompt": "Approval requests require source, owner, and reason.",
		"cover.CT_STUDIO_APPROVAL_GATE_SPEECH.defuse": "Source, owner, and reason accepted.",
		"cover.CT_STUDIO_APPROVAL_GATE_SPEECH.pressure": "The PM logs an incomplete approval request.",
		"cover.CT_PARK_OBSERVATION_PRESSURE.title": "Park Observation Test",
		"cover.CT_PARK_OBSERVATION_PRESSURE.prompt": "Remain inside public flow. Do not narrate the dream state.",
		"cover.CT_PARK_OBSERVATION_PRESSURE.defuse": "Observation returned to public-flow language.",
		"cover.CT_PARK_OBSERVATION_PRESSURE.pressure": "A witness records language outside public flow.",
		"cover.CT_STATION_SOFT_INQUEST.title": "Station Soft Inquest",
		"cover.CT_STATION_SOFT_INQUEST.prompt": "Answer only procedural questions and stay internally consistent.",
		"cover.CT_STATION_SOFT_INQUEST.defuse": "Procedural answer accepted by intake.",
		"cover.CT_STATION_SOFT_INQUEST.pressure": "The officer opens a procedural inconsistency note.",
		"speech.SA_COMPLY.label": "comply",
		"speech.SA_INQUIRE.label": "inquire",
		"speech.SA_FRAME.label": "frame",
		"speech.SA_BREAK.label": "break",
		"npc.NPC_Store_Clerk.label": "Store Clerk",
		"npc.NPC_Store_Clerk.role": "Store Clerk",
		"npc.NPC_Studio_PM.label": "Studio PM",
		"npc.NPC_Studio_PM.role": "Studio PM",
		"npc.NPC_Park_Witness.label": "Park Witness",
		"npc.NPC_Park_Witness.role": "Park Witness",
		"npc.NPC_Station_Officer.label": "Station Officer",
		"npc.NPC_Station_Officer.role": "Station Officer",
		"npc.reaction.uneasy": "noticed",
		"npc.reaction.probing": "checking",
		"npc.reaction.reported": "reported",
		"text_surface.TS_Store_QueueRules.label": "Queue Rules",
		"text_surface.TS_Store_QueueRules.body": "Store procedure: answer normally if this is your usual order. Uncertainty attaches a correction slip; mismatched speech moves to the report tray. Station cites only forwarded Store records.",
		"text_surface.TS_Studio_ApprovalCriteria.label": "Approval Criteria",
		"text_surface.TS_Studio_ApprovalCriteria.body": "Approval criteria: cite source, owner, and reason before requesting review.",
		"text_surface.TS_Park_NoticeBoard.label": "Notice Board",
		"text_surface.TS_Park_NoticeBoard.body": "Observation notice: remain in public flow and do not narrate the dream state.",
		"text_surface.TS_Station_IntakeRules.label": "Intake Rules",
		"text_surface.TS_Station_IntakeRules.body": "Station intake: procedural answers outrank explanation. The officer compares receipt, report tray, and ledger number before asking which statement stands.",
		"landmark.Store.label": "Store",
		"landmark.Store.hint": "Queue speech only",
		"landmark.Studio.label": "Studio",
		"landmark.Studio.hint": "Source owner reason",
		"landmark.Park.label": "Park",
		"landmark.Park.hint": "Public flow",
		"landmark.Station.label": "Station",
		"landmark.Station.hint": "Procedural intake",
		"label.two_lines": "{line1}\n{line2}",
		"zone.conversation": "CONVERSATION\nSame Order",
		"zone.cover_test": "COVER TEST\n{coverTest}"
	}
}

func _enter_tree() -> void:
	add_to_group("localization_services")
	_register_translations()
	set_locale(DEFAULT_LOCALE)

func set_locale(locale: String) -> void:
	var normalized := locale if SUPPORTED_LOCALES.has(locale) else DEFAULT_LOCALE
	if TranslationServer.get_locale().begins_with(normalized):
		_refresh_localized_nodes()
		return
	TranslationServer.set_locale(normalized)
	_refresh_localized_nodes()
	locale_changed.emit(normalized)

func get_locale() -> String:
	var locale := TranslationServer.get_locale()
	for supported in SUPPORTED_LOCALES:
		if locale.begins_with(supported):
			return supported
	return DEFAULT_LOCALE

func text(key: String, args: Dictionary = {}, fallback := "") -> String:
	var translated := str(TranslationServer.translate(StringName(key)))
	if translated == key and not fallback.is_empty():
		translated = fallback
	return translated.format(_resolve_args(args))

func _register_translations() -> void:
	if _translations_registered:
		return
	for locale in MESSAGES.keys():
		var translation := Translation.new()
		translation.locale = str(locale)
		var messages: Dictionary = MESSAGES[locale]
		for key in messages.keys():
			translation.add_message(StringName(str(key)), StringName(str(messages[key])))
		TranslationServer.add_translation(translation)
	_translations_registered = true

func _resolve_args(args: Dictionary) -> Dictionary:
	var resolved := {}
	for key in args.keys():
		var key_name := str(key)
		if key_name.ends_with("Key"):
			var resolved_name := key_name.substr(0, key_name.length() - 3)
			resolved[resolved_name] = text(str(args[key]))
		else:
			resolved[key_name] = args[key]
	return resolved

func _refresh_localized_nodes() -> void:
	if not is_inside_tree():
		return
	get_tree().call_group("localized_nodes", "refresh_locale")
	for node in get_tree().get_nodes_in_group("localized_meta_text"):
		if not node is Node:
			continue
		var translation_key := str(node.get_meta("translation_key", ""))
		if translation_key.is_empty():
			continue
		var args: Dictionary = node.get_meta("translation_args", {})
		var fallback := str(node.get_meta("translation_fallback", ""))
		var localized_text := text(translation_key, args, fallback)
		if node is Label3D:
			(node as Label3D).text = localized_text
		elif node is Label:
			(node as Label).text = localized_text
