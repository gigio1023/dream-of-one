extends CanvasLayer

signal language_changed(locale: String)

const LOCALE_BY_ITEM := ["ko", "en"]
const MAX_VISIBLE_EVIDENCE_EVENTS := 3

@onready var _language_label: Label = $Root/TopPanel/TopMargin/TopRows/TopBar/LanguageLabel
@onready var _language_select: OptionButton = $Root/TopPanel/TopMargin/TopRows/TopBar/LanguageSelect
@onready var _objective_label: Label = $Root/TopPanel/TopMargin/TopRows/ObjectiveLabel
@onready var _stage_label: Label = $Root/TopPanel/TopMargin/TopRows/StatusRows/StageLabel
@onready var _exposure_label: Label = $Root/TopPanel/TopMargin/TopRows/StatusRows/ExposureLabel
@onready var _station_label: Label = $Root/TopPanel/TopMargin/TopRows/StationLabel
@onready var _notice_panel: PanelContainer = $Root/NoticePanel
@onready var _notice_title: Label = $Root/NoticePanel/NoticeMargin/NoticeRows/NoticeTitle
@onready var _notice_body: Label = $Root/NoticePanel/NoticeMargin/NoticeRows/NoticeBody
@onready var _outcome_panel: PanelContainer = $Root/OutcomePanel
@onready var _outcome_title: Label = $Root/OutcomePanel/OutcomeMargin/OutcomeRows/OutcomeTitle
@onready var _outcome_body: Label = $Root/OutcomePanel/OutcomeMargin/OutcomeRows/OutcomeBody
@onready var _focus_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/FocusLabel
@onready var _choices_label: Label = $Root/BottomPanel/BottomMargin/BottomRows/ChoicesLabel
@onready var _evidence_title: Label = $Root/BottomPanel/BottomMargin/BottomRows/EvidenceTitle
@onready var _evidence_list: VBoxContainer = $Root/BottomPanel/BottomMargin/BottomRows/EvidenceList

var _syncing_language_select := false

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
	_language_label.text = _text("hud.language")
	_language_select.set_item_text(0, _text("language.korean"))
	_language_select.set_item_text(1, _text("language.english"))
	_choices_label.text = _text("hud.choices")
	_evidence_title.text = _text("hud.evidence")
	_sync_language_select()

func set_status(
	stage: String,
	exposure: int,
	station: Dictionary,
	objective: String
) -> void:
	_objective_label.text = objective
	_stage_label.text = _text("hud.stage", {"stageKey": "stage.%s" % stage})
	_exposure_label.text = _text("hud.exposure", {"exposure": exposure})
	_station_label.text = _text("hud.station_compact", {
		"intake": _flag(station.get("intakeOpen", false)),
		"inquest": _flag(station.get("inquestOpen", false)),
		"verdict": _flag(station.get("verdictReady", false)),
		"termination": _flag(station.get("sessionTerminationAllowed", false))
	})

func set_focus(prompt: String, choices_enabled: bool) -> void:
	_focus_label.text = prompt
	_choices_label.visible = choices_enabled

func set_notice(title: String, body: String, visible: bool) -> void:
	_notice_panel.visible = visible
	_notice_title.text = title
	_notice_body.text = body

func set_outcome(visible: bool, title: String, body: String) -> void:
	_outcome_panel.visible = visible
	if visible:
		_notice_panel.visible = false
	_outcome_title.text = title
	_outcome_body.text = body

func set_evidence(events: Array) -> void:
	for child in _evidence_list.get_children():
		child.queue_free()

	var start_index = max(events.size() - MAX_VISIBLE_EVIDENCE_EVENTS, 0)
	for event in events.slice(start_index):
		var label := Label.new()
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.add_theme_font_size_override(&"font_size", 13)
		label.add_theme_color_override(&"font_color", Color(0.82, 0.88, 0.9, 0.92))
		var ui_key := str(event.get("uiSummaryKey", ""))
		if ui_key.is_empty():
			label.text = "- %s" % str(event.get("summary", ""))
		else:
			var ui_args: Dictionary = event.get("uiSummaryArgs", {})
			label.text = "- %s" % _text(ui_key, ui_args)
		_evidence_list.add_child(label)

func _flag(value: Variant) -> String:
	return _text("state.open") if bool(value) else _text("state.closed")

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
