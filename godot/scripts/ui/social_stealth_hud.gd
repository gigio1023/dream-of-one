extends CanvasLayer

signal language_changed(locale: String)

const LOCALE_BY_ITEM := ["ko", "en"]
const MAX_VISIBLE_EVIDENCE_EVENTS := 3
const PRESSURE_WARNING := 60
const PRESSURE_VERDICT := 100

const UI_COPY := {
	"ko": {
		"case_title": "스테이션 사건 파일",
		"case_meta": "플레이 가능한 프롤로그 | 텍스트가 위험 표면입니다",
		"pressure": "사건 압박: {exposure} / 100 | {band}",
		"pressure_band_low": "관찰 중",
		"pressure_band_warning": "접수 압박",
		"pressure_band_verdict": "판정 임박",
		"consequence_opening": "먼저 규칙 표면을 읽고, 말하기 전에 절차를 확보하세요.",
		"consequence_default": "스테이션은 말보다 기록을 먼저 봅니다. Evidence가 다음 압박을 설명합니다.",
		"consequence_choices": "발화 선택은 커버를 보존하거나 Exposure를 올립니다.",
		"consequence_intake": "접수가 열렸습니다. 내부 일관성이 안전선입니다.",
		"consequence_inquest": "심문 압박입니다. 절차 밖의 설명은 Evidence로 남습니다.",
		"consequence_verdict": "판정 준비 완료. why-line이 세션 종료 근거가 됩니다.",
		"safe_opening": "SAFE: E로 규칙을 읽고 제한된 답변만 사용",
		"safe_default": "SAFE: 절차형 문장으로 보고를 유지",
		"safe_choices": "SAFE: 1/2/3은 커버를 절차 안에 둠",
		"safe_intake": "SAFE: 접수 질문에만 짧게 답변",
		"safe_inquest": "SAFE: 이전 보고와 같은 절차 언어 유지",
		"safe_verdict": "SAFE: 다음 시도에서는 커버 경로를 보존",
		"risky_opening": "RISK: 규칙 없이 말하면 스테이션이 이유를 만듦",
		"risky_default": "RISK: 커버 밖의 설명은 Exposure로 기록",
		"risky_choices": "RISK: 4는 커버를 깨고 압박을 상승",
		"risky_intake": "RISK: 불일치는 심문을 엶",
		"risky_inquest": "RISK: 자기해명은 판정 근거가 됨",
		"risky_verdict": "RISK: 스테이션이 세션 종료를 허가",
		"why_empty": "WHY-LINE: 아직 기록된 모순 없음",
		"why": "WHY-LINE: {line}",
		"evidence_count": "최근 Evidence {shown} / 전체 {total}",
		"evidence_empty": "Evidence가 아직 기록되지 않았습니다.",
		"outcome_stamp": "STATION VERDICT",
		"outcome_trace": "Trace: 규칙 표면 -> 커버 테스트 -> Exposure {exposure} -> 접수 {intake} / 심문 {inquest} / 판정 {verdict} / 종료 {termination}"
	},
	"en": {
		"case_title": "STATION CASE FILE",
		"case_meta": "Playable prologue | Text is the danger surface",
		"pressure": "Case pressure: {exposure} / 100 | {band}",
		"pressure_band_low": "observing",
		"pressure_band_warning": "intake pressure",
		"pressure_band_verdict": "verdict imminent",
		"consequence_opening": "Read a rule surface first, then secure procedure before speaking.",
		"consequence_default": "The Station reads records before speech. Evidence explains the next pressure.",
		"consequence_choices": "Speech choices either preserve cover or raise Exposure.",
		"consequence_intake": "Intake is open. Internal consistency is the safe line.",
		"consequence_inquest": "Inquest pressure. Explanations outside procedure become Evidence.",
		"consequence_verdict": "Verdict ready. The why-line is the session-closure basis.",
		"safe_opening": "SAFE: read rules with E and use bounded answers",
		"safe_default": "SAFE: keep the report procedural",
		"safe_choices": "SAFE: 1/2/3 keep cover inside procedure",
		"safe_intake": "SAFE: answer only the intake question",
		"safe_inquest": "SAFE: match the prior report language",
		"safe_verdict": "SAFE: preserve the cover route on the next pass",
		"risky_opening": "RISK: speaking without rules gives the Station a reason",
		"risky_default": "RISK: explanations outside cover become Exposure",
		"risky_choices": "RISK: 4 breaks cover and escalates pressure",
		"risky_intake": "RISK: inconsistency opens inquest",
		"risky_inquest": "RISK: self-explanation supports verdict",
		"risky_verdict": "RISK: the Station may close the session",
		"why_empty": "WHY-LINE: no contradiction recorded yet",
		"why": "WHY-LINE: {line}",
		"evidence_count": "Recent Evidence {shown} / total {total}",
		"evidence_empty": "No Evidence recorded yet.",
		"outcome_stamp": "STATION VERDICT",
		"outcome_trace": "Trace: rule surface -> cover test -> Exposure {exposure} -> intake {intake} / inquest {inquest} / verdict {verdict} / end {termination}"
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
@onready var _focus_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/FocusLabel
@onready var _choices_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/ChoicesLabel
@onready var _safe_line_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/SafeLineLabel
@onready var _risky_line_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/RiskyLineLabel
@onready var _evidence_title: Label = $Root/BottomPanel/BottomMargin/BottomRows/EvidenceTitle
@onready var _evidence_count: Label = $Root/BottomPanel/BottomMargin/BottomRows/EvidenceCountLabel
@onready var _evidence_list: VBoxContainer = $Root/BottomPanel/BottomMargin/BottomRows/EvidenceList

var _syncing_language_select := false
var _stage := "ambient"
var _exposure := 0
var _station: Dictionary = {}
var _choices_enabled := false
var _last_why_line := ""

func _ready() -> void:
	add_to_group("localized_nodes")
	_language_select.clear()
	_language_select.add_item(_text("language.korean"), 0)
	_language_select.set_item_metadata(0, "ko")
	_language_select.add_item(_text("language.english"), 1)
	_language_select.set_item_metadata(1, "en")
	_language_select.item_selected.connect(_on_language_selected)
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
	_sync_language_select()
	_refresh_pressure_presentation()
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
	_exposure_label.text = _text("hud.exposure", {"exposure": exposure})
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
	_focus_label.text = prompt
	_choices_label.visible = choices_enabled
	_refresh_consequence_text()

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

func _flag(value: Variant) -> String:
	return _text("state.open") if bool(value) else _text("state.closed")

func _event_summary_text(event: Dictionary) -> String:
	var ui_key := str(event.get("uiSummaryKey", ""))
	if ui_key.is_empty():
		return str(event.get("summary", ""))
	var ui_args: Dictionary = event.get("uiSummaryArgs", {})
	return _text(ui_key, ui_args)

func _refresh_pressure_presentation() -> void:
	_pressure_label.text = _ui_text("pressure", {
		"exposure": _exposure,
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
	_safe_line_label.text = _ui_text("safe_%s" % state_key)
	_risky_line_label.text = _ui_text("risky_%s" % state_key)

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
		if body.find("Exposure:") >= 0 or body.find("노출도:") >= 0:
			return clean_line
	return ""

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
