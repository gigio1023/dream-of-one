extends CanvasLayer

signal language_changed(locale: String)
signal free_input_submitted(line: String)

const LOCALE_BY_ITEM := ["ko", "en"]
const MAX_VISIBLE_EVIDENCE_EVENTS := 3
const PRESSURE_WARNING := 60
const PRESSURE_VERDICT := 100
const BOTTOM_COMPACT_TOP := -174.0
const BOTTOM_RECORD_TOP := -236.0
const BOTTOM_CONVERSATION_TOP := -316.0

const UI_COPY := {
	"ko": {
		"case_title": "스테이션 기록",
		"case_meta": "대화 프롤로그 | 당신의 말과 지연이 기록됩니다",
		"exposure_compact": "노출도: {exposureLabel}",
		"pressure": "의심/보고 압박: {exposureLabel} | {band}",
		"pressure_band_low": "관찰 중",
		"pressure_band_warning": "보고 직전",
		"pressure_band_verdict": "심문 개시",
		"consequence_opening": "당신은 검사 대상입니다. 상점 점원의 평범한 질문도 기록됩니다.",
		"consequence_default": "NPC는 발화의 어긋남을 먼저 느끼고, 스테이션은 그 기록을 나중에 봅니다.",
		"consequence_choices": "말과 응답 지연은 기록됩니다. 점원은 먼저 어긋남을 느끼고, 스테이션은 나중에 근거를 봅니다.",
		"consequence_intake": "대화 기록이 접수되었습니다. 앞선 말과 충돌하지 않아야 합니다.",
		"consequence_inquest": "심문 압박입니다. 이전 대화의 이상 신호가 근거가 됩니다.",
		"consequence_verdict": "세션 결과가 고정되었습니다. why-line이 근거입니다.",
		"record_chain_intake": "흐름: 플레이어 발화 -> 상점 기록 -> 보고 접수",
		"record_chain_inquest": "흐름: 플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용",
		"safe_opening": "상점 카운터에서 E로 대화 시작",
		"safe_default": "대화 선택지는 위험 라벨 없이 발화문으로만 표시됩니다.",
		"safe_choices": "선택지 1",
		"safe_intake": "스테이션은 상점 대화 기록을 참고합니다.",
		"safe_inquest": "이전 발화와 같은 전제를 유지하세요.",
		"safe_verdict": "R 다시 시작 / Q 종료",
		"risky_opening": "직접 입력한 말도 상점 기록으로 남습니다.",
		"risky_default": "직접 입력도 deterministic signal로만 판정됩니다.",
		"risky_choices": "선택지 2",
		"risky_intake": "보고 압박이 올라가면 심문이 열립니다.",
		"risky_inquest": "점원이 이상하다고 느낀 말이 증거가 됩니다.",
		"risky_verdict": "다음 시도에서는 말의 전제를 맞추세요.",
		"why_empty": "WHY-LINE: 아직 기록된 모순 없음",
		"why": "WHY-LINE: {line}",
		"recorded_statement": "직접 입력도 기록됩니다.",
		"recorded_statement_submit": "직접 입력도 기록됩니다.",
		"free_input_placeholder": "직접 입력 후 Enter: 말은 상점 기록에 남습니다",
		"recent_line": "최근 발화: {line}",
		"record_state": "상점 기록: 영수증 {receipt} | 정정 {correction} | 보고 {report} | 스테이션 {dossier} | 잔액 {credit} 신뢰 {trust} 부담 {burden} 주목 {attention} | 장부 {ledgerCount} 최근 {ledgerLatest} | 사회 반응 {socialLatest}",
		"investigation_trail": "검사자: {actor} | 대상: 플레이어 | 근거: {basis}",
		"provider_state": "AI 제공자: {mode} | API 검증 {live} | 모델 {model}",
		"evidence_count": "최근 기록 {shown} / 전체 {total}",
		"evidence_empty": "아직 기록 없음",
		"record.playable_session_started": "대화 프롤로그 시작",
		"record.text_surface_read": "상점 규칙을 읽음",
		"record.conversation_started": "점원이 질문함",
		"record.dialogue_choice_selected": "플레이어 발화 기록",
		"record.free_input_submitted": "기록된 진술 제출",
		"record.response_hesitation_noted": "응답 지연 기록",
		"record.conversation_anomaly_detected": "어긋난 말 감지",
		"record.npc_suspicion_changed": "점원 의심 변화",
		"record.suspicion_shared": "의심 공유",
		"record.station_report_created": "스테이션 보고 접수",
		"record.station_inquest_opened": "스테이션 심문 개시",
		"record.conversation_outcome_reached": "대화 결과 확정",
		"outcome_stamp": "세션 기록",
		"outcome_trace": "Trace: 상점 대화 -> 의심/보고 {exposure} -> 접수 {intake} / 심문 {inquest} / 판정 {verdict} / 종료 {termination}"
	},
	"en": {
		"case_title": "STATION RECORD",
		"case_meta": "Conversation prologue | Your speech and delays can become evidence",
		"exposure_compact": "Exposure: {exposureLabel}",
		"pressure": "Suspicion/report pressure: {exposureLabel} | {band}",
		"pressure_band_low": "observing",
		"pressure_band_warning": "near report",
		"pressure_band_verdict": "inquest open",
		"consequence_opening": "You are being examined. The clerk's ordinary question is still recorded.",
		"consequence_default": "NPCs notice conversational mismatch first; the Station reads the record later.",
		"consequence_choices": "Speech and delayed answers are recorded. The clerk notices mismatch first; the Station reads the basis later.",
		"consequence_intake": "Conversation record filed. Do not contradict earlier speech.",
		"consequence_inquest": "Inquest pressure. Earlier dialogue signals are the basis.",
		"consequence_verdict": "Session outcome is fixed. The why-line is the basis.",
		"record_chain_intake": "Chain: player speech -> Store record -> report filed",
		"record_chain_inquest": "Chain: player speech/delay -> Store record -> queue reaction -> Park notice -> report handoff -> Station citation",
		"safe_opening": "Press E at the store counter to start conversation",
		"safe_default": "Choices are shown as speech, not risk labels.",
		"safe_choices": "Choice 1",
		"safe_intake": "The Station references the store conversation.",
		"safe_inquest": "Keep the same premise as prior lines.",
		"safe_verdict": "R restart / Q quit",
		"risky_opening": "Typed speech also becomes a Store record.",
		"risky_default": "Typed speech is judged only by deterministic signals.",
		"risky_choices": "Choice 2",
		"risky_intake": "Report pressure can open inquest.",
		"risky_inquest": "The suspicious line becomes evidence.",
		"risky_verdict": "On the next pass, match the premise.",
		"why_empty": "WHY-LINE: no contradiction recorded yet",
		"why": "WHY-LINE: {line}",
		"recorded_statement": "Typed speech is recorded.",
		"recorded_statement_submit": "Typed speech is recorded.",
		"free_input_placeholder": "Type and press Enter: speech becomes a Store record",
		"recent_line": "Recent line: {line}",
		"record_state": "Store records: receipt {receipt} | correction {correction} | report {report} | Station {dossier} | credit {credit} trust {trust} burden {burden} attention {attention} | ledger {ledgerCount} latest {ledgerLatest} | social reaction {socialLatest}",
		"investigation_trail": "Examiner: {actor} | subject: player | basis: {basis}",
		"provider_state": "AI provider: {mode} | API verified {live} | model {model}",
		"evidence_count": "Recent record {shown} / total {total}",
		"evidence_empty": "No record yet.",
		"record.playable_session_started": "Conversation prologue started",
		"record.text_surface_read": "Store rule read",
		"record.conversation_started": "Clerk asked",
		"record.dialogue_choice_selected": "Player speech recorded",
		"record.free_input_submitted": "Recorded statement submitted",
		"record.response_hesitation_noted": "Response delay recorded",
		"record.conversation_anomaly_detected": "Speech mismatch detected",
		"record.npc_suspicion_changed": "Clerk suspicion changed",
		"record.suspicion_shared": "Suspicion shared",
		"record.station_report_created": "Station report filed",
		"record.station_inquest_opened": "Station inquest opened",
		"record.conversation_outcome_reached": "Conversation outcome fixed",
		"outcome_stamp": "SESSION RECORD",
		"outcome_trace": "Trace: Store conversation -> suspicion/report {exposure} -> intake {intake} / inquest {inquest} / verdict {verdict} / end {termination}"
	}
}

@onready var _case_title: Label = $Root/TopPanel/TopMargin/TopRows/TopBar/CaseTitle
@onready var _case_meta: Label = $Root/TopPanel/TopMargin/TopRows/CaseMetaLabel
@onready var _language_label: Label = $Root/TopPanel/TopMargin/TopRows/TopBar/LanguageLabel
@onready var _language_select: OptionButton = $Root/TopPanel/TopMargin/TopRows/TopBar/LanguageSelect
@onready var _objective_label: Label = $Root/TopPanel/TopMargin/TopRows/ObjectiveLabel
@onready var _stage_label: Label = $Root/TopPanel/TopMargin/TopRows/StatusRows/StageLabel
@onready var _exposure_label: Label = $Root/TopPanel/TopMargin/TopRows/StatusRows/ExposureLabel
@onready var _pressure_label: Label = $Root/TopPanel/TopMargin/TopRows/PressureLabel
@onready var _exposure_meter: ProgressBar = $Root/TopPanel/TopMargin/TopRows/ExposureMeter
@onready var _station_label: Label = $Root/TopPanel/TopMargin/TopRows/StationLabel
@onready var _investigation_trail_label: Label = $Root/TopPanel/TopMargin/TopRows/InvestigationTrailLabel
@onready var _consequence_label: Label = $Root/TopPanel/TopMargin/TopRows/ConsequenceLabel
@onready var _notice_panel: PanelContainer = $Root/NoticePanel
@onready var _notice_title: Label = $Root/NoticePanel/NoticeMargin/NoticeRows/NoticeTitle
@onready var _notice_body: Label = $Root/NoticePanel/NoticeMargin/NoticeRows/NoticeBody
@onready var _why_line_label: Label = $Root/NoticePanel/NoticeMargin/NoticeRows/WhyLineLabel
@onready var _outcome_panel: PanelContainer = $Root/OutcomePanel
@onready var _outcome_stamp: Label = $Root/OutcomePanel/OutcomeMargin/OutcomeRows/OutcomeStamp
@onready var _outcome_title: Label = $Root/OutcomePanel/OutcomeMargin/OutcomeRows/OutcomeTitle
@onready var _outcome_body: Label = $Root/OutcomePanel/OutcomeMargin/OutcomeRows/OutcomeBody
@onready var _outcome_trace: Label = $Root/OutcomePanel/OutcomeMargin/OutcomeRows/OutcomeTrace
@onready var _bottom_panel: PanelContainer = $Root/BottomPanel
@onready var _focus_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/FocusLabel
@onready var _choice_rows: VBoxContainer = $Root/BottomPanel/BottomMargin/BottomRows/ChoiceRows
@onready var _choices_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/ChoiceRows/ChoiceOnePanel/ChoiceOneMargin/ChoicesLabel
@onready var _safe_line_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/ChoiceRows/ChoiceTwoPanel/ChoiceTwoMargin/SafeLineLabel
@onready var _risky_line_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/ChoiceRows/ChoiceThreePanel/ChoiceThreeMargin/RiskyLineLabel
@onready var _recorded_statement_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/RecordedStatementLabel
@onready var _free_input_line: LineEdit = $Root/BottomPanel/BottomMargin/BottomRows/FreeInputLine
@onready var _record_state_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/RecordStateLabel
@onready var _provider_state_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/ProviderStateLabel
@onready var _evidence_title: Label = $Root/BottomPanel/BottomMargin/BottomRows/EvidenceTitle
@onready var _evidence_count: Label = $Root/BottomPanel/BottomMargin/BottomRows/EvidenceCountLabel
@onready var _evidence_list: VBoxContainer = $Root/BottomPanel/BottomMargin/BottomRows/EvidenceList

var _syncing_language_select := false
var _stage := "ambient"
var _exposure := 0
var _station: Dictionary = {}
var _choices_enabled := false
var _last_why_line := ""
var _active_choice_lines: Array[String] = []
var _recorded_statement_line := ""
var _recent_dialogue_line := ""
var _record_objects: Dictionary = {}
var _civic_economy: Dictionary = {}
var _civic_ledger_count := 0
var _latest_civic_ledger_text := "-"
var _latest_social_observation_text := "-"
var _provider_mode := "fallback-only M1"
var _provider_model := "none"
var _provider_live_verified := false

func _ready() -> void:
	add_to_group("localized_nodes")
	_language_select.clear()
	_language_select.add_item(_text("language.korean"), 0)
	_language_select.set_item_metadata(0, "ko")
	_language_select.add_item(_text("language.english"), 1)
	_language_select.set_item_metadata(1, "en")
	_language_select.item_selected.connect(_on_language_selected)
	_free_input_line.text_submitted.connect(_on_free_input_text_submitted)
	var localization := _localization()
	if localization != null and localization.has_signal("locale_changed"):
		localization.locale_changed.connect(_on_locale_changed)
	refresh_locale()

func refresh_locale() -> void:
	_case_title.text = _ui_text("case_title")
	_case_meta.text = _ui_text("case_meta")
	_language_label.text = _text("hud.language")
	_language_select.set_item_text(0, _text("language.korean"))
	_language_select.set_item_text(1, _text("language.english"))
	_choices_label.text = _text("hud.choices")
	_evidence_title.text = _text("hud.evidence")
	_free_input_line.placeholder_text = _ui_text("free_input_placeholder")
	_sync_language_select()
	_refresh_record_state_label()
	_refresh_investigation_trail_label()
	_refresh_provider_state_label()
	_refresh_pressure_presentation()
	_refresh_investigation_trail_label()
	_refresh_consequence_text()
	_refresh_why_line()
	_refresh_outcome_trace()

func set_status(
	stage: String,
	exposure: int,
	station: Dictionary,
	objective: String
) -> void:
	_stage = stage
	_exposure = exposure
	_station = station.duplicate(true)
	_objective_label.text = objective
	_stage_label.text = _text("hud.stage", {"stageKey": "stage.%s" % stage})
	_exposure_label.text = _ui_text("exposure_compact", {"exposureLabel": _pressure_label_value()})
	_station_label.text = _text("hud.station_compact", {
		"intake": _flag(station.get("intakeOpen", false)),
		"inquest": _flag(station.get("inquestOpen", false)),
		"verdict": _flag(station.get("verdictReady", false)),
		"termination": _flag(station.get("sessionTerminationAllowed", false))
	})
	_refresh_pressure_presentation()
	_refresh_consequence_text()
	_refresh_outcome_trace()

func set_focus(prompt: String, choices_enabled: bool) -> void:
	_choices_enabled = choices_enabled
	_active_choice_lines = []
	_recorded_statement_line = ""
	_recent_dialogue_line = ""
	_focus_label.text = prompt
	_choice_rows.visible = choices_enabled
	_choices_label.visible = choices_enabled
	_safe_line_label.visible = choices_enabled
	_risky_line_label.visible = choices_enabled
	_recorded_statement_label.visible = false
	_free_input_line.visible = false
	_free_input_line.text = ""
	_refresh_bottom_panel_layout()
	_refresh_consequence_text()

func set_conversation(
	npc_prompt: String,
	choices: Array,
	recorded_statement_line: String,
	history: Array,
	choices_enabled: bool
) -> void:
	_choices_enabled = choices_enabled
	_active_choice_lines = _string_array(choices)
	_recorded_statement_line = recorded_statement_line
	_recent_dialogue_line = ""
	_focus_label.text = npc_prompt
	_choice_rows.visible = choices_enabled
	_choices_label.visible = choices_enabled
	_safe_line_label.visible = choices_enabled
	_risky_line_label.visible = choices_enabled
	_recorded_statement_label.visible = false
	_free_input_line.visible = choices_enabled
	if not history.is_empty():
		_recent_dialogue_line = str(history[history.size() - 1])
	_recorded_statement_label.text = _ui_text("recorded_statement", {"line": recorded_statement_line})
	_free_input_line.placeholder_text = _ui_text("free_input_placeholder")
	_refresh_bottom_panel_layout()
	_refresh_consequence_text()

func debug_snapshot() -> Dictionary:
	return {
		"focusLabel": _focus_label.text,
		"choicesLabel": _choices_label.text,
		"safeLineLabel": _safe_line_label.text,
		"riskyLineLabel": _risky_line_label.text,
		"recordedStatementLabel": _recorded_statement_label.text,
		"recordStateLabel": _record_state_label.text,
		"investigationTrailLabel": _investigation_trail_label.text,
		"providerStateLabel": _provider_state_label.text,
		"consequenceLabel": _consequence_label.text,
		"freeInputVisible": _free_input_line.visible,
		"freeInputPlaceholder": _free_input_line.placeholder_text,
		"whyLineLabel": _why_line_label.text,
		"outcomeBodyLabel": _outcome_body.text,
		"outcomeTraceLabel": _outcome_trace.text,
		"outcomeVisible": _outcome_panel.visible,
		"noticeVisible": _notice_panel.visible
	}

func set_notice(title: String, body: String, visible: bool) -> void:
	_notice_panel.visible = visible
	_notice_title.text = title
	_notice_body.text = body
	var why_line := _extract_why_line(body)
	if visible and not why_line.is_empty():
		_last_why_line = why_line
	_refresh_why_line()

func set_outcome(visible: bool, title: String, body: String) -> void:
	_outcome_panel.visible = visible
	if visible:
		_notice_panel.visible = false
		var why_line := _extract_why_line(body)
		if not why_line.is_empty():
			_last_why_line = why_line
	_outcome_title.text = title
	_outcome_body.text = body
	_refresh_bottom_panel_layout()
	_refresh_why_line()
	_refresh_consequence_text()
	_refresh_outcome_trace()

func set_evidence(events: Array) -> void:
	for child in _evidence_list.get_children():
		child.queue_free()

	var start_index: int = int(max(events.size() - MAX_VISIBLE_EVIDENCE_EVENTS, 0))
	var visible_events: Array = events.slice(start_index)
	_evidence_count.text = _ui_text("evidence_count", {
		"shown": visible_events.size(),
		"total": events.size()
	})
	if visible_events.is_empty():
		var empty_label := Label.new()
		empty_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		empty_label.add_theme_font_size_override(&"font_size", 13)
		empty_label.add_theme_color_override(&"font_color", Color(0.7, 0.77, 0.8, 0.82))
		empty_label.text = _ui_text("evidence_empty")
		_evidence_list.add_child(empty_label)
		return

	var display_index: int = start_index + 1
	for event in visible_events:
		var label := Label.new()
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.add_theme_font_size_override(&"font_size", 13)
		label.add_theme_color_override(&"font_color", Color(0.82, 0.88, 0.9, 0.92))
		label.text = "EV-%02d  %s" % [display_index, _event_summary_text(event)]
		_evidence_list.add_child(label)
		display_index += 1

func set_record_state(record_objects: Dictionary, civic_economy: Dictionary, civic_ledger: Array, social_observations: Array = []) -> void:
	_record_objects = record_objects.duplicate(true)
	_civic_economy = civic_economy.duplicate(true)
	_civic_ledger_count = civic_ledger.size()
	_latest_civic_ledger_text = _latest_civic_ledger_label(civic_ledger)
	_latest_social_observation_text = _latest_social_observation_label(social_observations)
	_refresh_record_state_label()
	_refresh_investigation_trail_label()

func set_provider_state(provider_state: Dictionary) -> void:
	_provider_mode = str(provider_state.get("modeLabel", provider_state.get("mode", _provider_mode)))
	_provider_model = str(provider_state.get("selectedModel", _provider_model))
	_provider_live_verified = bool(provider_state.get("liveVerified", _provider_live_verified))
	_refresh_provider_state_label()

func _flag(value: Variant) -> String:
	return _text("state.open") if bool(value) else _text("state.closed")

func _event_summary_text(event: Dictionary) -> String:
	var ui_key := str(event.get("uiSummaryKey", ""))
	if ui_key.is_empty():
		var event_name := str(event.get("eventName", ""))
		var record_key := "record.%s" % event_name
		var record_text := _ui_text(record_key)
		if record_text != record_key:
			var line := str(event.get("displayedPlayerLine", ""))
			return "%s: %s" % [record_text, line] if not line.is_empty() else record_text
		return event_name
	var ui_args: Dictionary = event.get("uiSummaryArgs", {})
	return _text(ui_key, ui_args)

func _refresh_pressure_presentation() -> void:
	_pressure_label.text = _ui_text("pressure", {
		"exposureLabel": _pressure_label_value(),
		"band": _pressure_band()
	})
	_exposure_meter.value = clamp(float(_exposure), 0.0, 100.0)
	var pressure_color := Color(0.45, 0.76, 0.84, 0.92)
	if bool(_station.get("verdictReady", false)) or _exposure >= PRESSURE_VERDICT:
		pressure_color = Color(1.0, 0.42, 0.34, 0.95)
	elif _exposure >= PRESSURE_WARNING:
		pressure_color = Color(0.98, 0.72, 0.34, 0.95)
	_pressure_label.add_theme_color_override(&"font_color", pressure_color)
	var fill_style := _exposure_meter.get_theme_stylebox(&"fill")
	if fill_style is StyleBoxFlat:
		(fill_style as StyleBoxFlat).bg_color = pressure_color

func _pressure_band() -> String:
	if bool(_station.get("verdictReady", false)) or _exposure >= PRESSURE_VERDICT:
		return _ui_text("pressure_band_verdict")
	if _exposure >= PRESSURE_WARNING:
		return _ui_text("pressure_band_warning")
	return _ui_text("pressure_band_low")

func _refresh_consequence_text() -> void:
	var state_key := "default"
	if bool(_station.get("verdictReady", false)):
		state_key = "verdict"
	elif _choices_enabled:
		state_key = "choices"
	elif bool(_station.get("inquestOpen", false)):
		state_key = "inquest"
	elif bool(_station.get("intakeOpen", false)) or _stage == "intake":
		state_key = "intake"
	elif _exposure <= 0:
		state_key = "opening"
	_consequence_label.text = _ui_text("consequence_%s" % state_key)
	var record_chain := _record_chain_text(state_key)
	if not record_chain.is_empty():
		_consequence_label.text = "%s\n%s" % [_consequence_label.text, record_chain]
	if _choices_enabled and _active_choice_lines.size() >= 3:
		var consequence_lines := PackedStringArray([_ui_text("consequence_choices")])
		if not _recent_dialogue_line.is_empty():
			consequence_lines.append(_ui_text("recent_line", {"line": _recent_dialogue_line}))
		record_chain = _record_chain_text(state_key)
		if not record_chain.is_empty():
			consequence_lines.append(record_chain)
		_consequence_label.text = "\n".join(consequence_lines)
		_apply_active_choice_labels()
	else:
		_safe_line_label.text = _ui_text("safe_%s" % state_key)
		_risky_line_label.text = _ui_text("risky_%s" % state_key)
		_recorded_statement_label.visible = false
		_free_input_line.visible = false
	_refresh_bottom_panel_layout()

func _refresh_record_state_label() -> void:
	_record_state_label.text = _ui_text("record_state", {
		"receipt": _state_value(str(_record_objects.get("receipt_tray", "blank"))),
		"correction": _state_value(str(_record_objects.get("correction_slip", "absent"))),
		"report": _state_value(str(_record_objects.get("report_tray", "empty"))),
		"dossier": _state_value(str(_record_objects.get("station_dossier", "absent"))),
		"credit": int(_civic_economy.get("accountCredit", 3)),
		"trust": int(_civic_economy.get("localTrust", 50)),
		"burden": int(_civic_economy.get("recordBurden", 0)),
		"attention": int(_civic_economy.get("stationAttention", 0)),
		"ledgerCount": _civic_ledger_count,
		"ledgerLatest": _latest_civic_ledger_text,
		"socialLatest": _latest_social_observation_text
	})

func _record_chain_text(state_key: String) -> String:
	if bool(_station.get("inquestOpen", false)) or state_key == "inquest":
		return _ui_text("record_chain_inquest")
	if bool(_station.get("intakeOpen", false)) or state_key == "intake":
		return _ui_text("record_chain_intake")
	return ""

func _refresh_investigation_trail_label() -> void:
	var actor := _actor_role_label("store_clerk")
	var basis := _ui_basis_text("usual_order")
	if bool(_station.get("inquestOpen", false)):
		actor = _actor_role_label("station_officer")
		basis = _latest_civic_ledger_text if _latest_civic_ledger_text != "-" else _ui_basis_text("station_dossier")
	elif bool(_station.get("intakeOpen", false)):
		actor = "%s -> %s" % [_actor_role_label("store_manager"), _actor_role_label("station_officer")]
		basis = _ui_basis_text("store_report")
	elif _choices_enabled:
		actor = _actor_role_label("store_clerk")
		basis = _ui_basis_text("player_speech")
	_investigation_trail_label.text = _ui_text("investigation_trail", {
		"actor": actor,
		"basis": basis
	})

func _refresh_provider_state_label() -> void:
	_provider_state_label.text = _ui_text("provider_state", {
		"mode": _provider_mode,
		"live": _flag(_provider_live_verified),
		"model": _provider_model
	})

func _latest_civic_ledger_label(civic_ledger: Array) -> String:
	if civic_ledger.is_empty():
		return "-"
	var latest: Dictionary = civic_ledger[civic_ledger.size() - 1]
	var event_id := str(latest.get("eventId", ""))
	var kind_label := _civic_ledger_kind_label(str(latest.get("kind", "")))
	var role_label := _actor_role_label(str(latest.get("actorRole", "")))
	var affordance_label := _affordance_label(str(latest.get("affordance", "")))
	var cited_id := str(latest.get("citedLedgerEventId", ""))
	if not cited_id.is_empty():
		return "%s %s / %s / %s -> %s" % [event_id, role_label, affordance_label, kind_label, cited_id]
	return "%s %s / %s / %s" % [event_id, role_label, affordance_label, kind_label]

func _latest_social_observation_label(social_observations: Array) -> String:
	if social_observations.is_empty():
		return "-"
	var latest: Variant = social_observations[social_observations.size() - 1]
	if not latest is Dictionary:
		return "-"
	var observation: Dictionary = latest
	var observer := _actor_role_label(str(observation.get("observerRole", "")))
	var observed := _actor_role_label(str(observation.get("observedActorRole", "")))
	var observed_affordance := _affordance_label(str(observation.get("observedAffordance", "")))
	var resulting_affordance := _affordance_label(str(observation.get("resultingAffordance", "")))
	var pressure: Dictionary = observation.get("economyPressure", {})
	if _current_locale() == "en":
		return "%s saw %s %s -> %s, burden %d" % [
			observer,
			observed,
			observed_affordance,
			resulting_affordance,
			int(pressure.get("recordBurden", 0))
		]
	return "%s가 %s의 %s 기록을 보고 %s, 부담 %d" % [
		observer,
		observed,
		observed_affordance,
		resulting_affordance,
		int(pressure.get("recordBurden", 0))
	]

func _civic_ledger_kind_label(kind: String) -> String:
	var ko := {
		"store_sale_normal": "정상 영수증",
		"queue_routine_kept": "일상 유지",
		"queue_wary_noted": "대기줄 경계",
		"store_receipt_marked": "영수증 표시",
		"correction_offered": "정정 제안",
		"store_sale_corrected": "정정 처리",
		"queue_repair_accepted": "줄 수습",
		"queue_contact_refused": "접촉 거부",
		"public_repair_noted": "공개 수습",
		"queue_delay_noted": "대기줄 불평",
		"public_rumor_posted": "공개 소문",
		"store_exception_reported": "상점 보고",
		"store_report_escalated": "보고 전달",
		"station_record_cited": "스테이션 인용"
	}
	var en := {
		"store_sale_normal": "normal receipt",
		"queue_routine_kept": "routine kept",
		"queue_wary_noted": "queue wary note",
		"store_receipt_marked": "marked receipt",
		"correction_offered": "correction offered",
		"store_sale_corrected": "correction accepted",
		"queue_repair_accepted": "queue repair accepted",
		"queue_contact_refused": "contact refused",
		"public_repair_noted": "public repair noted",
		"queue_delay_noted": "queue delay noted",
		"public_rumor_posted": "public rumor posted",
		"store_exception_reported": "Store report",
		"store_report_escalated": "report forwarded",
		"station_record_cited": "Station cited"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(kind, kind))

func _actor_role_label(actor_role: String) -> String:
	var ko := {
		"store_clerk": "상점 점원",
		"store_manager": "상점 매니저",
		"waiting_customer": "대기 손님",
		"park_witness": "공원 목격자",
		"station_officer": "스테이션 직원"
	}
	var en := {
		"store_clerk": "Store Clerk",
		"store_manager": "Store Manager",
		"waiting_customer": "Waiting Customer",
		"park_witness": "Park Witness",
		"station_officer": "Station Officer"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(actor_role, actor_role))

func _affordance_label(affordance: String) -> String:
	var ko := {
		"create_receipt": "영수증 작성",
		"accept_routine": "일상 수락",
		"note_wary": "경계 메모",
		"mark_receipt": "영수증 표시",
		"attach_correction": "정정 첨부",
		"accept_repair": "수습 수락",
		"leave_queue": "줄 이탈",
		"refuse_contact": "접촉 거부",
		"pause_service": "응대 중단",
		"complain_delay": "대기 불평",
		"post_rumor": "공개 게시",
		"post_repair_notice": "수습 게시",
		"place_note": "메모 배치",
		"forward_report": "보고 전달",
		"cite_record": "기록 인용"
	}
	var en := {
		"create_receipt": "create receipt",
		"accept_routine": "accept routine",
		"note_wary": "note wary",
		"mark_receipt": "mark receipt",
		"attach_correction": "attach correction",
		"accept_repair": "accept repair",
		"leave_queue": "leave queue",
		"refuse_contact": "refuse contact",
		"pause_service": "pause service",
		"complain_delay": "complain delay",
		"post_rumor": "post public rumor",
		"post_repair_notice": "post repair notice",
		"place_note": "place note",
		"forward_report": "forward report",
		"cite_record": "cite record"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(affordance, affordance))

func _ui_basis_text(basis_id: String) -> String:
	var ko := {
		"usual_order": "단골 주문 절차",
		"player_speech": "방금 발화",
		"store_report": "상점 보고 기록",
		"station_dossier": "스테이션 문서"
	}
	var en := {
		"usual_order": "usual-order procedure",
		"player_speech": "latest speech",
		"store_report": "Store report record",
		"station_dossier": "Station dossier"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(basis_id, basis_id))

func _state_value(state: String) -> String:
	var ko := {
		"blank": "빈칸",
		"normal": "정상",
		"marked": "표시됨",
		"corrected": "정정됨",
		"absent": "없음",
		"offered": "제안됨",
		"attached": "첨부됨",
		"empty": "비어 있음",
		"pending": "대기",
		"forwarded": "전달",
		"cited": "인용됨",
		"read": "읽힘",
		"append_only": "추가됨"
	}
	var en := {
		"blank": "blank",
		"normal": "normal",
		"marked": "marked",
		"corrected": "corrected",
		"absent": "absent",
		"offered": "offered",
		"attached": "attached",
		"empty": "empty",
		"pending": "pending",
		"forwarded": "forwarded",
		"cited": "cited",
		"read": "read",
		"append_only": "append"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(state, state))

func _apply_active_choice_labels() -> void:
	_choice_rows.visible = true
	_choices_label.visible = true
	_safe_line_label.visible = true
	_risky_line_label.visible = true
	_choices_label.text = "1  %s" % _active_choice_lines[0]
	_safe_line_label.text = "2  %s" % _active_choice_lines[1]
	_risky_line_label.text = "3  %s" % _active_choice_lines[2]
	_recorded_statement_label.visible = false

func _on_free_input_text_submitted(line: String) -> void:
	var submitted := line.strip_edges()
	if submitted.is_empty():
		return
	_free_input_line.text = ""
	free_input_submitted.emit(submitted)

func _pressure_label_value() -> String:
	if _exposure > PRESSURE_VERDICT:
		return "100+"
	return "%d / 100" % _exposure

func _refresh_bottom_panel_layout() -> void:
	_bottom_panel.anchor_left = 0.0
	_bottom_panel.anchor_right = 1.0
	_bottom_panel.offset_left = 16.0
	_bottom_panel.offset_right = -16.0
	if _choices_enabled:
		_bottom_panel.offset_top = BOTTOM_CONVERSATION_TOP
	elif _outcome_panel.visible:
		_bottom_panel.offset_top = BOTTOM_RECORD_TOP
	else:
		_bottom_panel.offset_top = BOTTOM_COMPACT_TOP

func _refresh_why_line() -> void:
	_why_line_label.text = _ui_text("why_empty") if _last_why_line.is_empty() else _ui_text("why", {
		"line": _last_why_line
	})

func _refresh_outcome_trace() -> void:
	_outcome_stamp.text = _ui_text("outcome_stamp")
	_outcome_trace.text = _ui_text("outcome_trace", {
		"exposure": _exposure,
		"intake": _flag(_station.get("intakeOpen", false)),
		"inquest": _flag(_station.get("inquestOpen", false)),
		"verdict": _flag(_station.get("verdictReady", false)),
		"termination": _flag(_station.get("sessionTerminationAllowed", false))
	})

func _extract_why_line(body: String) -> String:
	var lines := body.split("\n", false)
	for line in lines:
		var clean_line := line.strip_edges()
		if clean_line.is_empty():
			continue
		if clean_line.findn("why-line") >= 0:
			var separator := clean_line.find(":")
			return clean_line.substr(separator + 1).strip_edges() if separator >= 0 else clean_line
	for line in lines:
		var clean_line := line.strip_edges()
		if clean_line.is_empty():
			continue
		if _is_pressure_notice(body):
			return clean_line
	return ""

func _is_pressure_notice(body: String) -> bool:
	if body.find("SA_COMPLY") >= 0:
		return false
	return body.find("Speech act:") >= 0 or body.find("발화 행동:") >= 0

func _string_array(value: Array) -> Array[String]:
	var result: Array[String] = []
	for item in value:
		result.append(str(item))
	return result

func _ui_text(key: String, args: Dictionary = {}) -> String:
	var fallback_messages: Dictionary = UI_COPY["ko"]
	var messages: Dictionary = UI_COPY.get(_current_locale(), fallback_messages)
	var template := str(messages.get(key, fallback_messages.get(key, key)))
	return template.format(args)

func _on_language_selected(index: int) -> void:
	if _syncing_language_select:
		return
	if index < 0 or index >= LOCALE_BY_ITEM.size():
		return
	var locale := str(LOCALE_BY_ITEM[index])
	var localization := _localization()
	if localization != null and localization.has_method("set_locale"):
		localization.set_locale(locale)
	else:
		TranslationServer.set_locale(locale)
	refresh_locale()
	language_changed.emit(locale)

func _on_locale_changed(_locale: String) -> void:
	refresh_locale()

func _sync_language_select() -> void:
	var locale := _current_locale()
	var target_index := LOCALE_BY_ITEM.find(locale)
	if target_index < 0:
		target_index = 0
	_syncing_language_select = true
	_language_select.select(target_index)
	_syncing_language_select = false

func _current_locale() -> String:
	var localization := _localization()
	if localization != null and localization.has_method("get_locale"):
		return str(localization.get_locale())
	var locale := TranslationServer.get_locale()
	if locale.begins_with("en"):
		return "en"
	return "ko"

func _text(key: String, args: Dictionary = {}, fallback := "") -> String:
	var localization := _localization()
	if localization != null and localization.has_method("text"):
		return str(localization.text(key, args, fallback))
	var translated := str(TranslationServer.translate(StringName(key)))
	if translated == key and not fallback.is_empty():
		translated = fallback
	return translated.format(args)

func _localization() -> Node:
	var nodes := get_tree().get_nodes_in_group("localization_services")
	if nodes.is_empty():
		return null
	return nodes[0]
