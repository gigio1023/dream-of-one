class_name HUD3D
extends CanvasLayer

signal settings_visibility_changed(visible: bool)
signal look_settings_changed(sensitivity: float, inverted: bool, fov: float)
signal ui_scale_requested(scale: float)
signal audio_settings_requested(master_volume: float, sfx_volume: float)
signal language_requested(locale_name: String)
signal choice_submitted(choice_id: String)
signal free_input_submitted(text: String)
signal conversation_end_retry_requested

const UI_SCALE_OPTIONS: Array[float] = [0.8, 1.0, 1.25, 1.5]
const LANGUAGE_OPTIONS: Array[String] = ["ko", "en"]
const TYPEWRITER_CHARACTERS_PER_SECOND := 42.0

@onready var _reticle: Label = %Reticle
@onready var _start_hint: Label = %StartHint
@onready var _prompt_panel: PanelContainer = %PromptPanel
@onready var _prompt_label: Label = %PromptLabel
@onready var _settings_shade: ColorRect = %SettingsShade
@onready var _settings_title: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/SettingsTitle
@onready var _sensitivity_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/SensitivityLabel
@onready var _sensitivity_slider: HSlider = %SensitivitySlider
@onready var _invert_y_check: CheckButton = %InvertYCheck
@onready var _fov_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/FovLabel
@onready var _fov_slider: HSlider = %FovSlider
@onready var _ui_scale_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/UiScaleLabel
@onready var _ui_scale_option: OptionButton = %UiScaleOption
@onready var _master_volume_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/MasterVolumeLabel
@onready var _master_volume_slider: HSlider = %MasterVolumeSlider
@onready var _sfx_volume_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/SfxVolumeLabel
@onready var _sfx_volume_slider: HSlider = %SfxVolumeSlider
@onready var _language_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/LanguageLabel
@onready var _language_option: OptionButton = %LanguageOption
@onready var _close_settings_button: Button = %CloseSettingsButton
@onready var _conversation_shade: ColorRect = $Overlay/ConversationShade
@onready var _conversation_speaker_label: Label = %ConversationSpeakerLabel
@onready var _conversation_stance_label: Label = %ConversationStanceLabel
@onready var _conversation_provider_label: Label = %ConversationProviderLabel
@onready var _conversation_prompt_label: Label = %ConversationPromptLabel
@onready var _conversation_thinking_label: Label = %ConversationThinkingLabel
@onready var _conversation_why_line_label: Label = %ConversationWhyLineLabel
@onready var _conversation_choice_1: Button = %ConversationChoice1
@onready var _conversation_choice_2: Button = %ConversationChoice2
@onready var _conversation_choice_3: Button = %ConversationChoice3
@onready var _conversation_input_row: HBoxContainer = $Overlay/ConversationShade/ConversationPanel/ConversationMargin/ConversationColumns/ConversationInputRow
@onready var _conversation_free_input: LineEdit = %ConversationFreeInput
@onready var _conversation_submit_button: Button = %ConversationSubmitButton
@onready var _conversation_status_label: Label = %ConversationStatusLabel
@onready var _end_conversation_button: Button = %EndConversationButton
@onready var _encountered_stance_panel: PanelContainer = $Overlay/EncounteredStancePanel
@onready var _encountered_stance_label: Label = %EncounteredStanceLabel

var _settings_visible := false
var _conversation_visible := false
var _conversation_busy := false
var _focused_target: Node
var _runtime_theme: Theme
var _conversation_actor_id := ""
var _current_turn: Dictionary = {}
var _current_stance := ""
var _last_why_line := ""
var _provider_meta: Dictionary = {}
var _choice_ids: Array[String] = ["", "", ""]
var _choice_buttons: Array[Button] = []
var _encountered_stances: Dictionary = {}
var _prompt_tween: Tween


func _ready() -> void:
	_choice_buttons = [_conversation_choice_1, _conversation_choice_2, _conversation_choice_3]
	_populate_ui_scale_options()
	_apply_localized_text()
	_sensitivity_slider.value_changed.connect(_on_look_setting_changed)
	_invert_y_check.toggled.connect(_on_invert_y_toggled)
	_fov_slider.value_changed.connect(_on_look_setting_changed)
	_ui_scale_option.item_selected.connect(_on_ui_scale_selected)
	_master_volume_slider.value_changed.connect(_on_audio_setting_changed)
	_sfx_volume_slider.value_changed.connect(_on_audio_setting_changed)
	_language_option.item_selected.connect(_on_language_selected)
	_close_settings_button.pressed.connect(close_settings)
	for index in _choice_buttons.size():
		_choice_buttons[index].pressed.connect(_on_choice_pressed.bind(index))
	_conversation_submit_button.pressed.connect(_submit_free_input)
	_conversation_free_input.text_submitted.connect(_on_free_input_text_submitted)
	_end_conversation_button.pressed.connect(_on_end_conversation_retry_pressed)
	_prompt_panel.visible = false
	_settings_shade.visible = false
	_conversation_shade.visible = false
	_conversation_thinking_label.visible = false
	_conversation_why_line_label.visible = false
	_conversation_status_label.visible = false
	_end_conversation_button.visible = false
	_encountered_stance_panel.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if _conversation_visible:
		if not _conversation_busy and not _conversation_free_input.has_focus():
			for index in _choice_buttons.size():
				if event.is_action_pressed("choice_%d" % (index + 1)):
					_on_choice_pressed(index)
					get_viewport().set_input_as_handled()
					return
		if event.is_action_pressed("cancel"):
			get_viewport().set_input_as_handled()
			return
	if _settings_visible and event.is_action_pressed("cancel"):
		close_settings()
		get_viewport().set_input_as_handled()


func set_focus(target: Node) -> void:
	_focused_target = target
	if _conversation_visible or _settings_visible:
		_prompt_panel.visible = false
		return
	if target == null or not target.has_method("get_interaction_label_key"):
		_prompt_panel.visible = false
		_reticle.modulate = Color(0.9, 0.9, 0.86, 0.8)
		return
	var label_key := str(target.call("get_interaction_label_key"))
	_prompt_label.text = tr(label_key)
	_prompt_panel.visible = not _prompt_label.text.is_empty()
	_reticle.modulate = Color(0.55, 0.95, 0.72, 1.0)


func configure_look_settings(sensitivity: float, inverted: bool, fov: float) -> void:
	_sensitivity_slider.set_value_no_signal(sensitivity)
	_invert_y_check.set_pressed_no_signal(inverted)
	_fov_slider.set_value_no_signal(fov)


func configure_preferences(
	ui_scale: float,
	master_volume: float,
	sfx_volume: float,
	locale_name: String
) -> void:
	_select_float_option(_ui_scale_option, UI_SCALE_OPTIONS, ui_scale)
	_master_volume_slider.set_value_no_signal(clampf(master_volume, 0.0, 1.0))
	_sfx_volume_slider.set_value_no_signal(clampf(sfx_volume, 0.0, 1.0))
	_select_language(locale_name)


func set_ui_scale(value: float) -> void:
	if _runtime_theme == null:
		_runtime_theme = $Overlay.theme.duplicate(true) as Theme
		$Overlay.theme = _runtime_theme
	_runtime_theme.default_base_scale = clampf(value, 0.8, 1.5)


func refresh_localized_text() -> void:
	_apply_localized_text()


func open_settings() -> void:
	if _conversation_visible:
		return
	_set_settings_visible(true)


func close_settings() -> void:
	_set_settings_visible(false)


func settings_visible() -> bool:
	return _settings_visible


func conversation_visible() -> bool:
	return _conversation_visible


func begin_conversation(actor: Dictionary) -> void:
	if _settings_visible:
		_set_settings_visible(false)
	_conversation_visible = true
	_conversation_busy = false
	_conversation_actor_id = str(actor.get("actorId", ""))
	_current_stance = str(actor.get("stance", ""))
	_current_turn.clear()
	_last_why_line = ""
	_provider_meta = {}
	_choice_ids = ["", "", ""]
	_conversation_speaker_label.text = _actor_label(_conversation_actor_id)
	_refresh_thinking_label()
	_refresh_stance_label()
	_refresh_provider_label()
	_conversation_prompt_label.text = ""
	_conversation_prompt_label.visible_ratio = 1.0
	_conversation_free_input.clear()
	_conversation_input_row.visible = false
	_conversation_why_line_label.visible = false
	_conversation_status_label.visible = false
	_end_conversation_button.visible = false
	for button in _choice_buttons:
		button.visible = false
	_conversation_shade.visible = true
	_prompt_panel.visible = false
	set_conversation_busy(true)


func show_turn(turn: Dictionary) -> bool:
	var choices_value: Variant = turn.get("choices", [])
	if not choices_value is Array or (choices_value as Array).size() != 3:
		show_conversation_error(&"hud.m3r.error.invalid_response")
		return false
	_current_turn = turn.duplicate(true)
	show_provider(_dictionary_or_empty(turn.get("proposalMeta")))
	_end_conversation_button.visible = false
	_set_status("")
	_typewrite_prompt(str(turn.get("prompt", "")))
	var choices: Array = choices_value as Array
	for index in _choice_buttons.size():
		var choice_value: Variant = choices[index]
		if not choice_value is Dictionary:
			show_conversation_error(&"hud.m3r.error.invalid_response")
			return false
		var choice := choice_value as Dictionary
		_choice_ids[index] = str(choice.get("choiceId", ""))
		_choice_buttons[index].text = str(choice.get("line", ""))
		_choice_buttons[index].visible = true
	_conversation_input_row.visible = bool(turn.get("acceptsFreeInput", false))
	_conversation_free_input.clear()
	set_conversation_busy(false)
	_choice_buttons[0].grab_focus()
	return true


func set_conversation_busy(value: bool) -> void:
	_conversation_busy = value
	_conversation_thinking_label.visible = value
	for button in _choice_buttons:
		button.disabled = value
	_conversation_free_input.editable = not value
	_conversation_submit_button.disabled = value
	_end_conversation_button.disabled = value


func show_provider(meta: Dictionary) -> void:
	_provider_meta = meta.duplicate(true)
	_refresh_provider_label()


func show_judgment(judgment: Dictionary) -> void:
	_last_why_line = str(judgment.get("whyLine", "")).strip_edges()
	_current_stance = str(judgment.get("stanceAfter", _current_stance))
	_refresh_stance_label()
	if not _last_why_line.is_empty():
		_conversation_why_line_label.text = str(
			tr(&"hud.m3r.why_line.format")
		).format({"reason": _last_why_line})
		_conversation_why_line_label.visible = true
	if not _conversation_actor_id.is_empty():
		_encountered_stances[_conversation_actor_id] = {
			"stance": _current_stance,
			"whyLine": _last_why_line,
		}
		_refresh_encountered_stances()


func show_conversation_error(key: StringName, allow_end_retry := false) -> void:
	set_conversation_busy(false)
	_set_status(str(tr(key)))
	_end_conversation_button.visible = allow_end_retry
	if allow_end_retry:
		clear_turn_controls()
		_end_conversation_button.grab_focus()


func show_conversation_ended() -> void:
	_set_status(str(tr(&"hud.m3r.conversation.ended")))


func clear_turn_controls() -> void:
	_current_turn.clear()
	for button in _choice_buttons:
		button.visible = false
	_conversation_input_row.visible = false


func close_conversation() -> void:
	if is_instance_valid(_prompt_tween):
		_prompt_tween.kill()
	_conversation_visible = false
	_conversation_busy = false
	_conversation_actor_id = ""
	_current_turn.clear()
	_provider_meta = {}
	_conversation_shade.visible = false
	_conversation_thinking_label.visible = false
	_end_conversation_button.visible = false
	_refresh_encountered_stances()
	set_focus(_focused_target)


func presentation_snapshot() -> Dictionary:
	return {
		"modalSurface": (
			"conversation" if _conversation_visible
			else "settings" if _settings_visible
			else "none"
		),
		"busy": _conversation_busy,
		"thinking": _conversation_busy,
		"hesitationTimerVisible": false,
		"uiScale": UI_SCALE_OPTIONS[_ui_scale_option.selected],
		"locale": LANGUAGE_OPTIONS[_language_option.selected],
		"currentTurn": _current_turn.duplicate(true),
		"encounteredStances": _encountered_stance_snapshot(),
		"provider": _provider_meta.duplicate(true),
	}


func _set_settings_visible(should_show: bool) -> void:
	if should_show and _conversation_visible:
		return
	if _settings_visible == should_show:
		return
	_settings_visible = should_show
	_settings_shade.visible = should_show
	if should_show:
		_prompt_panel.visible = false
		_encountered_stance_panel.visible = false
	else:
		_refresh_encountered_stances()
		set_focus(_focused_target)
	settings_visibility_changed.emit(should_show)
	if should_show:
		_close_settings_button.grab_focus()


func _on_look_setting_changed(_value: float) -> void:
	look_settings_changed.emit(
		float(_sensitivity_slider.value),
		_invert_y_check.button_pressed,
		float(_fov_slider.value)
	)


func _on_invert_y_toggled(_enabled: bool) -> void:
	_on_look_setting_changed(0.0)


func _on_ui_scale_selected(index: int) -> void:
	if index < 0 or index >= UI_SCALE_OPTIONS.size():
		return
	ui_scale_requested.emit(UI_SCALE_OPTIONS[index])


func _on_audio_setting_changed(_value: float) -> void:
	audio_settings_requested.emit(
		float(_master_volume_slider.value),
		float(_sfx_volume_slider.value)
	)


func _on_language_selected(index: int) -> void:
	if index < 0 or index >= LANGUAGE_OPTIONS.size():
		return
	language_requested.emit(LANGUAGE_OPTIONS[index])


func _on_choice_pressed(index: int) -> void:
	if not _conversation_visible or _conversation_busy:
		return
	if index < 0 or index >= _choice_ids.size() or _choice_ids[index].is_empty():
		return
	set_conversation_busy(true)
	choice_submitted.emit(_choice_ids[index])


func _on_free_input_text_submitted(_text: String) -> void:
	_submit_free_input()


func _submit_free_input() -> void:
	if not _conversation_visible or _conversation_busy or not _conversation_input_row.visible:
		return
	var text := _conversation_free_input.text.strip_edges()
	if text.is_empty():
		_set_status(str(tr(&"hud.m3r.conversation.input_required")))
		_conversation_free_input.grab_focus()
		return
	set_conversation_busy(true)
	free_input_submitted.emit(text)


func _on_end_conversation_retry_pressed() -> void:
	if not _conversation_visible or _conversation_busy:
		return
	set_conversation_busy(true)
	conversation_end_retry_requested.emit()


func _populate_ui_scale_options() -> void:
	_ui_scale_option.clear()
	for value in UI_SCALE_OPTIONS:
		_ui_scale_option.add_item("%d%%" % roundi(value * 100.0))


func _apply_localized_text() -> void:
	_start_hint.text = tr(&"hud.m3r.start_hint")
	_invert_y_check.text = tr(&"hud.settings.invert_y")
	_close_settings_button.text = tr(&"hud.settings.return")
	_settings_title.text = tr(&"hud.settings.title")
	_sensitivity_label.text = tr(&"hud.settings.look_sensitivity")
	_fov_label.text = tr(&"hud.settings.fov")
	_ui_scale_label.text = tr(&"hud.settings.ui_scale")
	_master_volume_label.text = tr(&"hud.settings.master_volume")
	_sfx_volume_label.text = tr(&"hud.settings.sfx_volume")
	_language_label.text = tr(&"hud.settings.language")
	_refresh_thinking_label()
	_conversation_free_input.placeholder_text = tr(&"hud.m3r.conversation.input_placeholder")
	_conversation_submit_button.text = tr(&"hud.m3r.conversation.submit")
	_end_conversation_button.text = tr(&"hud.m3r.conversation.retry_end")
	_refresh_stance_label()
	_refresh_provider_label()
	_refresh_encountered_stances()
	_populate_language_options()
	set_focus(_focused_target)


func _typewrite_prompt(text: String) -> void:
	if is_instance_valid(_prompt_tween):
		_prompt_tween.kill()
	_conversation_prompt_label.text = text
	if text.length() < 2:
		_conversation_prompt_label.visible_ratio = 1.0
		return
	_conversation_prompt_label.visible_ratio = 0.0
	_prompt_tween = create_tween()
	_prompt_tween.tween_property(
		_conversation_prompt_label,
		"visible_ratio",
		1.0,
		maxf(0.15, float(text.length()) / TYPEWRITER_CHARACTERS_PER_SECOND)
	)


func _set_status(text: String) -> void:
	_conversation_status_label.text = text
	_conversation_status_label.visible = not text.is_empty()


func _refresh_stance_label() -> void:
	if not is_instance_valid(_conversation_stance_label):
		return
	if _current_stance.is_empty():
		_conversation_stance_label.visible = false
		_conversation_stance_label.text = ""
		return
	_conversation_stance_label.visible = true
	_conversation_stance_label.text = "%s · %s" % [
		tr(&"hud.m3r.stance.header"),
		_stance_text(_current_stance),
	]


func _refresh_thinking_label() -> void:
	if not is_instance_valid(_conversation_thinking_label):
		return
	_conversation_thinking_label.text = str(
		tr(&"hud.m3r.conversation.thinking")
	).format({"speaker": _actor_label(_conversation_actor_id)})


func _refresh_provider_label() -> void:
	if not is_instance_valid(_conversation_provider_label):
		return
	var transport := str(_provider_meta.get("transport", ""))
	if transport == "scripted":
		_conversation_provider_label.text = str(tr(&"hud.m3r.provider.scripted"))
		_conversation_provider_label.visible = true
		return
	if transport == "fallback" or bool(_provider_meta.get("usedFallback", false)):
		var reason := str(_provider_meta.get("fallbackReason", "unknown"))
		if reason not in [
			"missing_credentials",
			"unavailable",
			"timeout",
			"rate_limited",
			"invalid_envelope",
			"budget_exhausted",
			"transport_error",
		]:
			reason = "unknown"
		var reason_text := str(tr("hud.m3r.provider.reason.%s" % reason))
		_conversation_provider_label.text = str(
			tr(&"hud.m3r.provider.fallback_format")
		).format({"reason": reason_text})
		_conversation_provider_label.visible = true
		return
	_conversation_provider_label.text = ""
	_conversation_provider_label.visible = false


func _refresh_encountered_stances() -> void:
	if not is_instance_valid(_encountered_stance_label):
		return
	if _encountered_stances.is_empty():
		_encountered_stance_panel.visible = false
		_encountered_stance_label.text = ""
		return
	var lines: Array[String] = [str(tr(&"hud.m3r.encountered_stances.title"))]
	for actor_value in _encountered_stances.keys():
		var actor_id := str(actor_value)
		var stance_value: Variant = _encountered_stances[actor_value]
		var stance := str(
			(stance_value as Dictionary).get("stance", "uncertain")
			if stance_value is Dictionary
			else stance_value
		)
		var why_line := str(
			(stance_value as Dictionary).get("whyLine", "")
			if stance_value is Dictionary
			else ""
		)
		lines.append(
			str(tr(&"hud.m3r.encountered_stances.entry")).format({
				"actor": _actor_label(actor_id),
				"stance": _stance_text(stance),
			})
		)
		if not why_line.is_empty():
			lines.append(
				str(tr(&"hud.m3r.why_line.format")).format({"reason": why_line})
			)
	_encountered_stance_label.text = "\n".join(lines)
	_encountered_stance_panel.visible = not _conversation_visible and not _settings_visible


func _encountered_stance_snapshot() -> Array:
	var result: Array = []
	for actor_value in _encountered_stances.keys():
		var actor_id := str(actor_value)
		var stance_value: Variant = _encountered_stances[actor_value]
		var entry := stance_value as Dictionary if stance_value is Dictionary else {}
		result.append({
			"actorId": actor_id,
			"title": _actor_label(actor_id),
			"stance": str(entry.get("stance", stance_value)),
			"summary": str(entry.get("whyLine", "")),
		})
	return result


func _actor_label(actor_id: String) -> String:
	if actor_id.is_empty():
		return str(tr(&"hud.m3r.conversation.speaker_fallback"))
	var key := "npc.%s.label" % actor_id
	var localized := str(tr(key))
	return actor_id if localized == key else localized


func _stance_text(stance: String) -> String:
	var normalized := stance if stance in ["oppose", "uncertain", "vouch"] else "uncertain"
	return str(tr("hud.m3r.stance.%s" % normalized))


func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}


func _populate_language_options() -> void:
	var selected_locale := TranslationServer.get_locale().split("_")[0]
	_language_option.clear()
	for index in LANGUAGE_OPTIONS.size():
		var locale_name := LANGUAGE_OPTIONS[index]
		_language_option.add_item(tr("hud.language.%s" % locale_name))
		if locale_name == selected_locale:
			_language_option.select(index)


func _select_float_option(option: OptionButton, values: Array[float], target: float) -> void:
	var selected_index := 0
	for index in values.size():
		if is_equal_approx(values[index], target):
			selected_index = index
			break
	option.select(selected_index)


func _select_language(locale_name: String) -> void:
	var normalized := locale_name.to_lower().split("_")[0]
	for index in LANGUAGE_OPTIONS.size():
		if LANGUAGE_OPTIONS[index] == normalized:
			_language_option.select(index)
			return
	_language_option.select(0)
