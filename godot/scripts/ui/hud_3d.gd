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
signal ambient_subtitle_started(event: Dictionary)
signal log_visibility_changed(visible: bool)
signal debug_visibility_changed(visible: bool)
signal hesitation_expired
signal restart_requested
signal provider_failure_retry_requested
signal provider_failure_restart_requested

const UI_SCALE_OPTIONS: Array[float] = [0.8, 1.0, 1.25, 1.5]
const TYPEWRITER_CHARACTERS_PER_SECOND := 42.0
const AMBIENT_SUBTITLE_MIN_SECONDS := 2.4
const AMBIENT_SUBTITLE_MAX_SECONDS := 6.0
const AMBIENT_SUBTITLE_SECONDS_PER_CHARACTER := 0.055
const OUTCOME_ACTOR_IDS: PackedStringArray = [
	"NPC_Studio_Receptionist",
	"NPC_Studio_Manager",
	"NPC_Office_Worker",
	"NPC_Park_Caretaker",
	"NPC_Station_Officer",
	"NPC_Roaming_Liaison",
]

@onready var _reticle: Label = %Reticle
@onready var _start_hint: Label = %StartHint
@onready var _contact_cue_panel: PanelContainer = %ContactCuePanel
@onready var _contact_cue_label: Label = %ContactCueLabel
@onready var _prompt_panel: PanelContainer = %PromptPanel
@onready var _prompt_label: Label = %PromptLabel
@onready var _ambient_subtitle_panel: PanelContainer = %AmbientSubtitlePanel
@onready var _ambient_subtitle_label: Label = %AmbientSubtitleLabel
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
@onready var _conversation_panel: PanelContainer = $Overlay/ConversationShade/ConversationPanel
@onready var _conversation_speaker_label: Label = %ConversationSpeakerLabel
@onready var _conversation_stance_label: Label = %ConversationStanceLabel
@onready var _conversation_provider_label: Label = %ConversationProviderLabel
@onready var _conversation_prompt_label: Label = %ConversationPromptLabel
@onready var _conversation_thinking_label: Label = %ConversationThinkingLabel
@onready var _conversation_timer_label: Label = %ConversationTimerLabel
@onready var _conversation_why_line_label: Label = %ConversationWhyLineLabel
@onready var _conversation_choice_1: Button = %ConversationChoice1
@onready var _conversation_choice_2: Button = %ConversationChoice2
@onready var _conversation_choice_3: Button = %ConversationChoice3
@onready var _conversation_input_row: HBoxContainer = $Overlay/ConversationShade/ConversationPanel/ConversationMargin/ConversationColumns/ConversationInputRow
@onready var _conversation_free_input: LineEdit = %ConversationFreeInput
@onready var _conversation_submit_button: Button = %ConversationSubmitButton
@onready var _conversation_status_label: Label = %ConversationStatusLabel
@onready var _end_conversation_button: Button = %EndConversationButton
@onready var _provider_failure_panel: PanelContainer = %ProviderFailurePanel
@onready var _provider_failure_title: Label = %ProviderFailureTitle
@onready var _provider_failure_body: Label = %ProviderFailureBody
@onready var _provider_failure_reason: Label = %ProviderFailureReason
@onready var _provider_failure_retry_button: Button = %ProviderFailureRetryButton
@onready var _provider_failure_restart_button: Button = %ProviderFailureRestartButton
@onready var _provider_failure_status: Label = %ProviderFailureStatus
@onready var _encountered_stance_panel: PanelContainer = $Overlay/EncounteredStancePanel
@onready var _encountered_stance_label: Label = %EncounteredStanceLabel
@onready var _log_shade: ColorRect = %LogShade
@onready var _log_title: Label = %LogTitle
@onready var _log_body: RichTextLabel = %LogBody
@onready var _log_error_label: Label = %LogErrorLabel
@onready var _log_busy_label: Label = %LogBusyLabel
@onready var _close_log_button: Button = %CloseLogButton
@onready var _outcome_shade: ColorRect = %OutcomeShade
@onready var _outcome_title: Label = %OutcomeTitle
@onready var _outcome_verdict_label: Label = %OutcomeVerdictLabel
@onready var _outcome_vouch_label: Label = %OutcomeVouchLabel
@onready var _outcome_body: RichTextLabel = %OutcomeBody
@onready var _outcome_status_label: Label = %OutcomeStatusLabel
@onready var _restart_button: Button = %RestartButton
@onready var _hearing_fade: ColorRect = %HearingFade
@onready var _debug_panel: PanelContainer = %DebugPanel
@onready var _debug_text: RichTextLabel = %DebugText
@onready var _localization: Node = get_node("/root/Localization")

var _settings_visible := false
var _conversation_visible := false
var _conversation_busy := false
var _log_visible := false
var _log_busy := false
var _debug_visible := false
var _focused_target: Node
var _preload_target: Node
var _interaction_prompt_actionable := false
var _interaction_prompt_preparing := false
var _runtime_theme: Theme
var _conversation_actor_id := ""
var _current_turn: Dictionary = {}
var _current_stance := ""
var _last_why_line := ""
var _last_stance_judgment: Dictionary = {}
var _input_limit_rejected := false
var _provider_meta: Dictionary = {}
var _choice_ids: Array[String] = ["", "", ""]
var _choice_buttons: Array[Button] = []
var _social_view: Dictionary = {}
var _prompt_tween: Tween
var _retry_button_mode: StringName = &"end"
var _ambient_subtitle_queue: Array[Dictionary] = []
var _current_ambient_subtitle: Dictionary = {}
var _ambient_subtitle_remaining := 0.0
var _language_options: Array[String] = []
var _language_applies_next_run := false
var _contact_cue_id := ""
var _contact_cue_actor_id := ""
var _contact_cue_ready := false
var _hearing_opening_state := ""
var _hesitation_active := false
var _hesitation_emitted := false
var _hesitation_duration_seconds := 0.0
var _hesitation_remaining_seconds := 0.0
var _outcome_visible := false
var _outcome_busy := false
var _outcome_result: Dictionary = {}
var _outcome_presented_testimonies: Array[Dictionary] = []
var _outcome_recap_lines: Array[String] = []
var _outcome_presented_recap: Array[Dictionary] = []
var _hearing_fade_tween: Tween
var _provider_failure: Dictionary = {}
var _provider_failure_can_retry := false
var _provider_failure_can_restart := false
var _provider_failure_busy_action := ""
var _provider_failure_restart_error := false


func _ready() -> void:
	_choice_buttons = [_conversation_choice_1, _conversation_choice_2, _conversation_choice_3]
	_apply_export_font()
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
	_conversation_free_input.text_changed.connect(_on_free_input_text_changed)
	_conversation_free_input.text_change_rejected.connect(_on_free_input_text_change_rejected)
	_end_conversation_button.pressed.connect(_on_end_conversation_retry_pressed)
	_provider_failure_retry_button.pressed.connect(_on_provider_failure_retry_pressed)
	_provider_failure_restart_button.pressed.connect(
		_on_provider_failure_restart_pressed
	)
	_configure_keyboard_focus_paths()
	_close_log_button.pressed.connect(close_log)
	_restart_button.pressed.connect(_on_restart_pressed)
	_prompt_panel.visible = false
	_contact_cue_panel.visible = false
	_ambient_subtitle_panel.visible = false
	_settings_shade.visible = false
	_conversation_shade.visible = false
	_conversation_thinking_label.visible = false
	_conversation_timer_label.visible = false
	_conversation_why_line_label.visible = false
	_conversation_status_label.visible = false
	_retry_button_mode = &"end"
	_refresh_retry_button_text()
	_end_conversation_button.visible = false
	_provider_failure_panel.visible = false
	_encountered_stance_panel.visible = false
	_log_shade.visible = false
	_log_error_label.visible = false
	_log_busy_label.visible = false
	_outcome_shade.visible = false
	_outcome_status_label.visible = false
	_hearing_fade.visible = false
	_debug_panel.visible = false
	$Overlay.resized.connect(_layout_conversation_panel)
	call_deferred("_layout_conversation_panel")


func _notification(what: int) -> void:
	if what != NOTIFICATION_TRANSLATION_CHANGED or not is_node_ready():
		return
	# Localization selects the regional export face before changing the
	# TranslationServer locale. Refresh the HUD's private, UI-scale theme copy
	# as part of the same notification so overlapping Han never stays on KR.
	_apply_export_font()
	_apply_localized_text()


func _process(delta: float) -> void:
	_process_hesitation_timer(delta)
	if _current_ambient_subtitle.is_empty():
		return
	if _conversation_visible or _settings_visible or _log_visible:
		return
	_ambient_subtitle_remaining = maxf(0.0, _ambient_subtitle_remaining - delta)
	if is_zero_approx(_ambient_subtitle_remaining):
		_current_ambient_subtitle = {}
		_show_next_ambient_subtitle()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_debug") and OS.is_debug_build():
		_set_debug_visible(not _debug_visible)
		get_viewport().set_input_as_handled()
		return
	if _outcome_visible:
		if event.is_action_pressed("cancel") or event.is_action_pressed("open_log"):
			get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("open_log") and not _conversation_visible and not _settings_visible:
		toggle_log()
		get_viewport().set_input_as_handled()
		return
	if _log_visible:
		if event.is_action_pressed("cancel"):
			close_log()
			get_viewport().set_input_as_handled()
		return
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
	_refresh_interaction_prompt()


func set_preload_target(target: Node) -> void:
	_preload_target = target
	_refresh_interaction_prompt()


func _refresh_interaction_prompt() -> void:
	_interaction_prompt_actionable = false
	_interaction_prompt_preparing = false
	if _conversation_visible or _settings_visible or _log_visible or _outcome_visible:
		_prompt_panel.visible = false
		return
	var prompt_target: Node = (
		_focused_target if is_instance_valid(_focused_target) else null
	)
	var label_method := "get_interaction_label_key"
	if prompt_target != null:
		_interaction_prompt_actionable = true
	elif (
		is_instance_valid(_preload_target)
		and _preload_target.has_method("get_preload_status_label_key")
		and (
			not _preload_target.has_method("is_interaction_enabled")
			or not bool(_preload_target.call("is_interaction_enabled"))
		)
	):
		prompt_target = _preload_target
		label_method = "get_preload_status_label_key"
		_interaction_prompt_preparing = true
	if prompt_target == null or not prompt_target.has_method(label_method):
		_prompt_panel.visible = false
		_reticle.modulate = Color(0.9, 0.9, 0.86, 0.8)
		return
	var label_key := str(prompt_target.call(label_method))
	_prompt_label.text = tr(label_key)
	_prompt_panel.visible = not _prompt_label.text.is_empty()
	_reticle.modulate = (
		Color(0.55, 0.95, 0.72, 1.0)
		if _interaction_prompt_actionable
		else Color(0.95, 0.78, 0.42, 0.95)
	)


func show_contact_approach(contact_id: String, actor_id: String) -> void:
	if contact_id.is_empty() or actor_id.is_empty():
		return
	_contact_cue_id = contact_id
	_contact_cue_actor_id = actor_id
	_contact_cue_ready = false
	_refresh_contact_cue()


func show_contact_ready(contact_id: String, actor_id: String) -> void:
	if contact_id.is_empty() or actor_id.is_empty():
		return
	_contact_cue_id = contact_id
	_contact_cue_actor_id = actor_id
	_contact_cue_ready = true
	_refresh_contact_cue()


func clear_contact_approach(contact_id := "") -> void:
	if not contact_id.is_empty() and contact_id != _contact_cue_id:
		return
	_contact_cue_id = ""
	_contact_cue_actor_id = ""
	_contact_cue_ready = false
	_refresh_contact_cue()


func show_hearing_opening(retrying := false) -> void:
	_hearing_opening_state = "retry" if retrying else "opening"
	_refresh_contact_cue()


func clear_hearing_opening() -> void:
	_hearing_opening_state = ""
	_refresh_contact_cue()


func contact_cue_snapshot() -> Dictionary:
	return {
		"visible": _contact_cue_panel.visible,
		"text": _contact_cue_label.text,
		"contactId": _contact_cue_id,
		"actorId": _contact_cue_actor_id,
		"ready": _contact_cue_ready,
		"status": "ready" if _contact_cue_ready else "approaching",
		"hearingOpening": not _hearing_opening_state.is_empty(),
	}


func hesitation_timer_snapshot() -> Dictionary:
	return {
		"visible": _conversation_timer_label.visible,
		"active": _hesitation_active,
		"expired": _hesitation_emitted,
		"durationSeconds": _hesitation_duration_seconds,
		"remainingSeconds": _hesitation_remaining_seconds,
		"text": _conversation_timer_label.text,
	}


func stop_hesitation_timer() -> void:
	_hesitation_active = false
	_conversation_timer_label.visible = false


func fade_to_hearing() -> void:
	if is_instance_valid(_hearing_fade_tween):
		_hearing_fade_tween.kill()
	_hearing_fade.visible = true
	_hearing_fade.color.a = 0.0
	_hearing_fade_tween = create_tween().set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	_hearing_fade_tween.tween_property(_hearing_fade, "color:a", 1.0, 0.22)
	await _hearing_fade_tween.finished


func fade_from_hearing() -> void:
	if is_instance_valid(_hearing_fade_tween):
		_hearing_fade_tween.kill()
	_hearing_fade.visible = true
	_hearing_fade.color.a = 1.0
	_hearing_fade_tween = create_tween().set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	_hearing_fade_tween.tween_property(_hearing_fade, "color:a", 0.0, 0.22)
	await _hearing_fade_tween.finished
	_hearing_fade.visible = false


func show_outcome(result: Dictionary) -> void:
	if result.is_empty():
		return
	var failed_meta := _provider_failure_from_result(result)
	if not failed_meta.is_empty():
		show_provider_failure(failed_meta, false)
		return
	stop_hesitation_timer()
	if _settings_visible:
		_set_settings_visible(false)
	if _log_visible:
		_set_log_busy(false)
		_set_log_visible(false)
	if _conversation_visible:
		close_conversation()
	_outcome_result = result.duplicate(true)
	_outcome_visible = true
	_outcome_busy = false
	_hearing_opening_state = ""
	_outcome_shade.visible = true
	_prompt_panel.visible = false
	_reticle.visible = false
	_contact_cue_panel.visible = false
	_ambient_subtitle_panel.visible = false
	_encountered_stance_panel.visible = false
	_refresh_outcome()
	_restart_button.grab_focus()


func outcome_visible() -> bool:
	return _outcome_visible


func set_outcome_busy(value: bool, error_key := StringName()) -> void:
	_outcome_busy = value
	_restart_button.disabled = value
	_outcome_status_label.text = "" if error_key.is_empty() else str(tr(error_key))
	_outcome_status_label.visible = value or not _outcome_status_label.text.is_empty()
	if value:
		_outcome_status_label.text = str(tr(&"hud.m3r.outcome.restart_busy"))


func outcome_snapshot() -> Dictionary:
	return {
		"visible": _outcome_visible,
		"busy": _outcome_busy,
		"route": str(_outcome_result.get("verdict", "")),
		"title": _outcome_title.text,
		"verdictWhy": str(_outcome_result.get("verdictWhyLine", "")),
		"officerLine": str(_outcome_result.get("officerLine", "")),
		"verdictDisplay": _outcome_verdict_label.text,
		"vouchCount": _outcome_vouch_count(),
		"requiredVouches": 4,
		"testimonies": _outcome_presented_testimonies.duplicate(true),
		"recapLines": _outcome_recap_lines.duplicate(),
		"recapEntries": _outcome_presented_recap.duplicate(true),
		"citedRecordIds": _array_or_empty(_outcome_result.get("citedRecordIds")),
		"citedLedgerEventIds": _array_or_empty(
			_outcome_result.get("citedLedgerEventIds")
		),
		"body": _outcome_body.text,
		"status": _outcome_status_label.text if _outcome_status_label.visible else "",
		"restartDisabled": _restart_button.disabled,
	}


func show_provider_failure(
	failure: Dictionary,
	can_retry: bool,
	can_restart := false
) -> void:
	if failure.is_empty():
		return
	var normalized := _normalize_provider_failure(failure)
	if normalized.is_empty():
		return
	_provider_failure = normalized
	_provider_failure_can_retry = can_retry
	_provider_failure_can_restart = can_restart
	_provider_failure_busy_action = ""
	_provider_failure_restart_error = false
	_provider_failure_retry_button.disabled = false
	_provider_failure_restart_button.disabled = false
	_provider_failure_status.text = ""
	_provider_failure_status.visible = false
	# A provider failure is not a terminal verdict. If a malformed or legacy
	# response tries to pair the two, remove the verdict surface rather than
	# presenting deterministic content as though the model authored it.
	_outcome_visible = false
	_outcome_busy = false
	_outcome_result = {}
	_outcome_presented_testimonies.clear()
	_outcome_recap_lines.clear()
	_outcome_presented_recap.clear()
	_outcome_shade.visible = false
	_outcome_title.text = ""
	_outcome_verdict_label.text = ""
	_outcome_vouch_label.text = ""
	_outcome_body.text = ""
	_outcome_status_label.text = ""
	_outcome_status_label.visible = false
	_restart_button.disabled = false
	_provider_meta = {}
	_refresh_provider_label()
	_refresh_provider_failure()
	_provider_failure_panel.visible = true
	_focus_provider_failure_action()
	call_deferred("_focus_provider_failure_action")


func clear_provider_failure() -> void:
	_provider_failure = {}
	_provider_failure_can_retry = false
	_provider_failure_can_restart = false
	_provider_failure_busy_action = ""
	_provider_failure_restart_error = false
	_provider_failure_panel.visible = false
	_provider_failure_retry_button.disabled = false
	_provider_failure_restart_button.disabled = false
	_provider_failure_status.text = ""
	_provider_failure_status.visible = false


func provider_failure_visible() -> bool:
	return _provider_failure_panel.visible and not _provider_failure.is_empty()


func set_provider_failure_retry_busy(value: bool) -> void:
	set_provider_failure_action_busy(value, &"retry" if value else &"")


func set_provider_failure_action_busy(value: bool, action := StringName()) -> void:
	_provider_failure_busy_action = str(action) if value else ""
	_provider_failure_retry_button.disabled = value
	_provider_failure_restart_button.disabled = value
	if value:
		_provider_failure_restart_error = false
	_refresh_provider_failure()
	if not value:
		_focus_provider_failure_action()


func show_provider_failure_restart_error() -> void:
	_provider_failure_busy_action = ""
	_provider_failure_restart_error = true
	_provider_failure_retry_button.disabled = false
	_provider_failure_restart_button.disabled = false
	_refresh_provider_failure()
	_focus_provider_failure_action(true)


func _configure_keyboard_focus_paths() -> void:
	_conversation_free_input.focus_next = _conversation_free_input.get_path_to(
		_conversation_submit_button
	)
	_conversation_free_input.focus_neighbor_right = (
		_conversation_free_input.get_path_to(_conversation_submit_button)
	)
	_conversation_submit_button.focus_previous = _conversation_submit_button.get_path_to(
		_conversation_free_input
	)
	_conversation_submit_button.focus_neighbor_left = (
		_conversation_submit_button.get_path_to(_conversation_free_input)
	)
	_provider_failure_retry_button.focus_next = (
		_provider_failure_retry_button.get_path_to(_provider_failure_restart_button)
	)
	_provider_failure_retry_button.focus_neighbor_bottom = (
		_provider_failure_retry_button.get_path_to(_provider_failure_restart_button)
	)
	_provider_failure_restart_button.focus_previous = (
		_provider_failure_restart_button.get_path_to(_provider_failure_retry_button)
	)
	_provider_failure_restart_button.focus_neighbor_top = (
		_provider_failure_restart_button.get_path_to(_provider_failure_retry_button)
	)


func _focus_provider_failure_action(prefer_restart := false) -> void:
	if not _provider_failure_panel.visible or not _provider_failure_busy_action.is_empty():
		return
	if (
		prefer_restart
		and _provider_failure_restart_button.visible
		and not _provider_failure_restart_button.disabled
	):
		_provider_failure_restart_button.grab_focus()
		return
	if _provider_failure_retry_button.visible and not _provider_failure_retry_button.disabled:
		_provider_failure_retry_button.grab_focus()
		return
	if _provider_failure_restart_button.visible and not _provider_failure_restart_button.disabled:
		_provider_failure_restart_button.grab_focus()


func provider_failure_snapshot() -> Dictionary:
	return {
		"visible": _provider_failure_panel.visible,
		"title": _provider_failure_title.text,
		"body": _provider_failure_body.text,
		"reason": _provider_failure_reason.text,
		"retryVisible": _provider_failure_retry_button.visible,
		"retryDisabled": _provider_failure_retry_button.disabled,
		"restartVisible": _provider_failure_restart_button.visible,
		"restartDisabled": _provider_failure_restart_button.disabled,
		"busyAction": _provider_failure_busy_action,
		"status": (
			_provider_failure_status.text
			if _provider_failure_status.visible
			else ""
		),
		"failure": _provider_failure.duplicate(true),
	}


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
	_ensure_runtime_theme()
	_runtime_theme.default_base_scale = clampf(value, 0.8, 1.5)
	call_deferred("_layout_conversation_panel")


func refresh_localized_text() -> void:
	_apply_export_font()
	_apply_localized_text()


func set_language_applies_next_run(value: bool) -> void:
	_language_applies_next_run = value
	if is_instance_valid(_language_label):
		_refresh_language_label()


func enqueue_ambient_subtitle(event: Dictionary, direction: StringName) -> void:
	var line := str(event.get("line", "")).strip_edges()
	if line.is_empty():
		return
	var queued := event.duplicate(true)
	queued["direction"] = str(direction)
	_ambient_subtitle_queue.append(queued)
	if _current_ambient_subtitle.is_empty():
		_show_next_ambient_subtitle()


func accept_current_ambient_subtitle(
	expected_seq: int,
	direction: StringName,
	player_audibility: Dictionary
) -> bool:
	if int(_current_ambient_subtitle.get("seq", -1)) != expected_seq:
		return false
	_current_ambient_subtitle["direction"] = str(direction)
	_current_ambient_subtitle["playerAudibility"] = player_audibility.duplicate(true)
	_refresh_ambient_subtitle_text()
	_refresh_ambient_subtitle_visibility()
	return true


func discard_current_ambient_subtitle(expected_seq: int) -> bool:
	if int(_current_ambient_subtitle.get("seq", -1)) != expected_seq:
		return false
	_current_ambient_subtitle = {}
	_ambient_subtitle_remaining = 0.0
	_refresh_ambient_subtitle_text()
	_refresh_ambient_subtitle_visibility()
	_show_next_ambient_subtitle()
	return true


func ambient_subtitle_snapshot() -> Dictionary:
	if _current_ambient_subtitle.is_empty():
		return {
			"visible": false,
			"queuedCount": _ambient_subtitle_queue.size(),
			"current": {},
		}
	var current := _current_ambient_subtitle.duplicate(true)
	current["formattedText"] = _ambient_subtitle_label.text
	current["remainingSeconds"] = _ambient_subtitle_remaining
	return {
		"visible": _ambient_subtitle_panel.visible,
		"queuedCount": _ambient_subtitle_queue.size(),
		"current": current,
	}


func clear_ambient_subtitles() -> void:
	_ambient_subtitle_queue.clear()
	_current_ambient_subtitle = {}
	_ambient_subtitle_remaining = 0.0
	_refresh_ambient_subtitle_text()
	_refresh_ambient_subtitle_visibility()


func open_settings() -> void:
	if _conversation_visible or _log_visible or _outcome_visible:
		return
	_set_settings_visible(true)


func close_settings() -> void:
	_set_settings_visible(false)


func settings_visible() -> bool:
	return _settings_visible


func conversation_visible() -> bool:
	return _conversation_visible


func log_visible() -> bool:
	return _log_visible


func debug_visible() -> bool:
	return _debug_visible


func log_busy() -> bool:
	return _log_busy


func toggle_log() -> void:
	if _log_busy or _outcome_visible:
		return
	_set_log_visible(not _log_visible)


func open_log(error_key := StringName()) -> void:
	if _conversation_visible or _settings_visible or _outcome_visible:
		return
	if not error_key.is_empty():
		show_log_error(error_key)
	_set_log_visible(true)


func close_log() -> void:
	if _log_busy:
		return
	_set_log_visible(false)


func open_log_busy() -> void:
	if _conversation_visible or _settings_visible or _outcome_visible:
		return
	clear_log_error()
	_set_log_busy(true)
	_set_log_visible(true)


func finish_log_busy(error_key := StringName()) -> void:
	_set_log_busy(false)
	if not error_key.is_empty():
		show_log_error(error_key)


func show_log_error(key: StringName) -> void:
	_log_error_label.text = str(tr(key))
	_log_error_label.visible = not _log_error_label.text.is_empty()


func clear_log_error() -> void:
	_log_error_label.text = ""
	_log_error_label.visible = false


func set_social_view(value: Dictionary) -> bool:
	if not value.has("revision"):
		return false
	var incoming_revision := int(value.get("revision", -1))
	var current_revision := int(_social_view.get("revision", -1))
	if incoming_revision < current_revision:
		return false
	_social_view = value.duplicate(true)
	if not _conversation_actor_id.is_empty():
		_current_stance = _disclosed_stance(_conversation_actor_id)
		_refresh_stance_label()
	_refresh_encountered_stances()
	_refresh_log_body()
	return true


func social_view_snapshot() -> Dictionary:
	return _social_view.duplicate(true)


func set_debug_snapshot(value: Dictionary) -> void:
	if not OS.is_debug_build():
		return
	_debug_text.text = JSON.stringify(value, "  ")


func begin_conversation(actor: Dictionary) -> void:
	if _outcome_visible:
		return
	if _settings_visible:
		_set_settings_visible(false)
	_conversation_visible = true
	_conversation_busy = false
	_conversation_actor_id = str(actor.get("actorId", ""))
	_current_stance = _disclosed_stance(_conversation_actor_id)
	_current_turn.clear()
	_reset_hesitation_timer()
	_last_why_line = ""
	_last_stance_judgment = {}
	_input_limit_rejected = false
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
	_refresh_contact_cue()
	_refresh_ambient_subtitle_visibility()
	set_conversation_busy(true)


func show_turn(turn: Dictionary) -> bool:
	var choices_value: Variant = turn.get("choices", [])
	if not choices_value is Array:
		show_conversation_error(&"hud.m3r.error.invalid_response")
		return false
	var choices: Array = choices_value as Array
	var procedure := str(turn.get("procedure", "ordinary"))
	var accepts_free_input := bool(turn.get("acceptsFreeInput", false))
	var hearing_turn := procedure == "hearing"
	if (
		hearing_turn
		and (
			not choices.is_empty()
			or not accepts_free_input
			or bool(turn.get("continueConversation", true))
			or turn.get("proposalMeta", {}) != null
		)
	) or (not hearing_turn and choices.size() != 3):
		show_conversation_error(&"hud.m3r.error.invalid_response")
		return false
	_current_turn = turn.duplicate(true)
	show_provider(_dictionary_or_empty(turn.get("proposalMeta")))
	_end_conversation_button.visible = false
	_set_status("")
	_typewrite_prompt(str(turn.get("prompt", "")))
	_choice_ids = ["", "", ""]
	for button in _choice_buttons:
		button.visible = false
	for index in choices.size():
		var choice_value: Variant = choices[index]
		if not choice_value is Dictionary:
			show_conversation_error(&"hud.m3r.error.invalid_response")
			return false
		var choice := choice_value as Dictionary
		_choice_ids[index] = str(choice.get("choiceId", ""))
		_choice_buttons[index].text = str(choice.get("line", ""))
		_choice_buttons[index].visible = true
	_conversation_input_row.visible = accepts_free_input
	_input_limit_rejected = false
	_conversation_free_input.clear()
	if accepts_free_input:
		_refresh_input_feedback()
	_configure_hesitation_timer(turn)
	set_conversation_busy(false)
	if provider_failure_visible():
		_focus_provider_failure_action()
	elif hearing_turn:
		_conversation_free_input.call_deferred("grab_focus")
	else:
		_choice_buttons[0].grab_focus()
	return true


func set_conversation_busy(value: bool) -> void:
	_conversation_busy = value
	if value:
		stop_hesitation_timer()
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
	var disclosed := _disclosed_resident(_conversation_actor_id)
	_last_why_line = str(disclosed.get("whyLine", "")).strip_edges()
	_current_stance = _disclosed_stance(_conversation_actor_id)
	_last_stance_judgment = {
		"actorId": _conversation_actor_id,
		"stanceBefore": str(judgment.get("stanceBefore", _current_stance)),
		"stanceAfter": str(judgment.get("stanceAfter", _current_stance)),
		"suspicionDelta": int(judgment.get("suspicionDelta", 0)),
	}
	_refresh_stance_label()
	_refresh_encountered_stances()
	if not _last_why_line.is_empty():
		_conversation_why_line_label.text = str(
			tr(&"hud.m3r.why_line.format")
		).format({"reason": _last_why_line})
		_conversation_why_line_label.visible = true


func show_conversation_error(key: StringName, allow_end_retry := false) -> void:
	set_conversation_busy(false)
	_set_status(str(tr(key)))
	_retry_button_mode = &"end"
	_refresh_retry_button_text()
	_end_conversation_button.visible = allow_end_retry
	if allow_end_retry:
		clear_turn_controls()
		if provider_failure_visible():
			_focus_provider_failure_action()
		else:
			_end_conversation_button.grab_focus()


func show_conversation_start_retry() -> void:
	set_conversation_busy(false)
	_set_status(str(tr(&"hud.m3r.error.conversation_start")))
	_retry_button_mode = &"start"
	_refresh_retry_button_text()
	clear_turn_controls()
	_end_conversation_button.visible = true
	if provider_failure_visible():
		_focus_provider_failure_action()
	else:
		_end_conversation_button.grab_focus()


func show_conversation_ended() -> void:
	_set_status(str(tr(&"hud.m3r.conversation.ended")))


func clear_turn_controls() -> void:
	_current_turn.clear()
	stop_hesitation_timer()
	for button in _choice_buttons:
		button.visible = false
	_conversation_input_row.visible = false


func close_conversation() -> void:
	if is_instance_valid(_prompt_tween):
		_prompt_tween.kill()
	_conversation_visible = false
	_conversation_busy = false
	_reset_hesitation_timer()
	_conversation_actor_id = ""
	_retry_button_mode = &"end"
	_current_turn.clear()
	_provider_meta = {}
	_conversation_shade.visible = false
	_conversation_thinking_label.visible = false
	_end_conversation_button.visible = false
	_refresh_encountered_stances()
	_refresh_ambient_subtitle_visibility()
	_refresh_contact_cue()
	set_focus(_focused_target)


func presentation_snapshot() -> Dictionary:
	return {
		"modalSurface": (
			"outcome" if _outcome_visible
			else "conversation" if _conversation_visible
			else "inspect" if _log_visible
			else "settings" if _settings_visible
			else "none"
		),
		"busy": _conversation_busy,
		"thinking": _conversation_busy,
		"conversationTurnActionable": conversation_turn_actionable(),
		"hesitationTimerVisible": _conversation_timer_label.visible,
		"hesitationTimer": hesitation_timer_snapshot(),
		"uiScale": UI_SCALE_OPTIONS[_ui_scale_option.selected],
		"locale": str(_localization.call("locale")),
		"selectedLocale": _selected_language(),
		"interactionPrompt": {
			"visible": _prompt_panel.visible,
			"text": _prompt_label.text if _prompt_panel.visible else "",
			"actionable": _interaction_prompt_actionable,
			"preparing": _interaction_prompt_preparing,
		},
		"languageOptions": _language_options.duplicate(),
		"languageAppliesNextRun": _language_applies_next_run,
		"exportFont": _dictionary_or_empty(_localization.call("font_selection_snapshot")),
		"currentTurn": _current_turn.duplicate(true),
		"stanceJudgment": _last_stance_judgment.duplicate(true),
		"encounteredStances": _encountered_stance_snapshot(),
		"socialView": _social_view.duplicate(true),
		"hearing": _dictionary_or_empty(_social_view.get("hearing")),
		"institutionalPressure": _pressure_snapshot(),
		"log": {
			"visible": _log_visible,
			"busy": _log_busy,
			"body": _log_body.text,
			"error": _log_error_label.text if _log_error_label.visible else "",
		},
		"debugVisible": _debug_visible,
		"provider": _provider_meta.duplicate(true),
		"providerFailure": provider_failure_snapshot(),
		"ambientSubtitle": ambient_subtitle_snapshot(),
		"contactCue": contact_cue_snapshot(),
		"outcome": outcome_snapshot(),
	}


func conversation_turn_actionable() -> bool:
	if not _conversation_visible or _conversation_busy or _current_turn.is_empty():
		return false
	for button in _choice_buttons:
		if button.visible and not button.disabled:
			return true
	return (
		_conversation_input_row.visible
		and _conversation_free_input.visible
		and _conversation_free_input.editable
		and not _conversation_submit_button.disabled
	)


func _layout_conversation_panel() -> void:
	if not is_instance_valid(_conversation_panel) or not is_instance_valid($Overlay):
		return
	var viewport_size: Vector2 = $Overlay.size
	var horizontal_margin := 24.0
	var vertical_margin := 24.0
	var panel_width := minf(1120.0, maxf(0.0, viewport_size.x - horizontal_margin * 2.0))
	_conversation_panel.anchor_left = 0.5
	_conversation_panel.anchor_top = 0.0
	_conversation_panel.anchor_right = 0.5
	_conversation_panel.anchor_bottom = 1.0
	_conversation_panel.offset_left = -panel_width * 0.5
	_conversation_panel.offset_top = vertical_margin
	_conversation_panel.offset_right = panel_width * 0.5
	_conversation_panel.offset_bottom = -vertical_margin


func _set_settings_visible(should_show: bool) -> void:
	if should_show and (_conversation_visible or _log_visible or _outcome_visible):
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
	_refresh_ambient_subtitle_visibility()
	_refresh_contact_cue()
	settings_visibility_changed.emit(should_show)
	if should_show:
		_close_settings_button.grab_focus()


func _set_log_visible(should_show: bool) -> void:
	if not should_show and _log_busy:
		return
	if should_show and (_conversation_visible or _settings_visible or _outcome_visible):
		return
	if _log_visible == should_show:
		return
	_log_visible = should_show
	_log_shade.visible = should_show
	if should_show:
		_prompt_panel.visible = false
		_encountered_stance_panel.visible = false
		_refresh_log_body()
		_close_log_button.grab_focus()
	else:
		clear_log_error()
		_refresh_encountered_stances()
		set_focus(_focused_target)
	_refresh_ambient_subtitle_visibility()
	_refresh_contact_cue()
	log_visibility_changed.emit(should_show)


func _set_debug_visible(should_show: bool) -> void:
	_debug_visible = should_show and OS.is_debug_build()
	_debug_panel.visible = _debug_visible
	debug_visibility_changed.emit(_debug_visible)


func _set_log_busy(should_be_busy: bool) -> void:
	_log_busy = should_be_busy
	_log_busy_label.visible = should_be_busy
	_close_log_button.disabled = should_be_busy


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
	if index < 0 or index >= _language_options.size():
		return
	language_requested.emit(_language_options[index])


func _on_choice_pressed(index: int) -> void:
	if not _conversation_visible or _conversation_busy:
		return
	if index < 0 or index >= _choice_ids.size() or _choice_ids[index].is_empty():
		return
	set_conversation_busy(true)
	choice_submitted.emit(_choice_ids[index])


func _on_free_input_text_submitted(_text: String) -> void:
	_submit_free_input()


func _on_free_input_text_changed(new_text: String) -> void:
	if new_text.length() < _conversation_free_input.max_length:
		_input_limit_rejected = false
	_refresh_input_feedback()


func _on_free_input_text_change_rejected(rejected_substring: String) -> void:
	if rejected_substring.is_empty():
		return
	_input_limit_rejected = true
	_refresh_input_feedback()


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


func _on_restart_pressed() -> void:
	if not _outcome_visible or _outcome_busy:
		return
	set_outcome_busy(true)
	restart_requested.emit()


func _on_provider_failure_retry_pressed() -> void:
	if (
		_provider_failure.is_empty()
		or not _provider_failure_can_retry
		or not _provider_failure_busy_action.is_empty()
	):
		return
	set_provider_failure_action_busy(true, &"retry")
	provider_failure_retry_requested.emit()


func _on_provider_failure_restart_pressed() -> void:
	if (
		_provider_failure.is_empty()
		or not _provider_failure_can_restart
		or not _provider_failure_busy_action.is_empty()
	):
		return
	set_provider_failure_action_busy(true, &"restart")
	provider_failure_restart_requested.emit()


func _configure_hesitation_timer(turn: Dictionary) -> void:
	_reset_hesitation_timer()
	if (
		str(turn.get("procedure", "ordinary")) != "interrogation"
		or int(turn.get("hesitationMs", 0)) < 40000
	):
		return
	_hesitation_duration_seconds = float(int(turn.get("hesitationMs", 0))) / 1000.0
	_hesitation_remaining_seconds = _hesitation_duration_seconds
	_hesitation_active = true
	_refresh_hesitation_timer_text()
	_conversation_timer_label.visible = true


func _process_hesitation_timer(delta: float) -> void:
	if not _hesitation_active:
		return
	_hesitation_remaining_seconds = maxf(0.0, _hesitation_remaining_seconds - delta)
	_refresh_hesitation_timer_text()
	if not is_zero_approx(_hesitation_remaining_seconds):
		return
	_hesitation_active = false
	_conversation_timer_label.visible = false
	if _hesitation_emitted:
		return
	_hesitation_emitted = true
	_set_status(str(tr(&"hud.m3r.interrogation.hesitation_submitted")))
	hesitation_expired.emit()


func _reset_hesitation_timer() -> void:
	_hesitation_active = false
	_hesitation_emitted = false
	_hesitation_duration_seconds = 0.0
	_hesitation_remaining_seconds = 0.0
	if is_instance_valid(_conversation_timer_label):
		_conversation_timer_label.text = ""
		_conversation_timer_label.visible = false


func _refresh_hesitation_timer_text() -> void:
	if not is_instance_valid(_conversation_timer_label):
		return
	_conversation_timer_label.text = str(
		tr(&"hud.m3r.interrogation.timer")
	).format({"seconds": ceili(_hesitation_remaining_seconds)})


func _refresh_outcome() -> void:
	if not is_instance_valid(_outcome_title):
		return
	var verdict := str(_outcome_result.get("verdict", "abnormal"))
	if verdict not in ["ordinary", "abnormal"]:
		verdict = "abnormal"
	_outcome_title.text = str(tr("hud.m3r.outcome.title.%s" % verdict))
	var verdict_why := str(_outcome_result.get("verdictWhyLine", "")).strip_edges()
	var verdict_display := str(
		tr(&"hud.m3r.outcome.verdict_why")
	).format({"reason": verdict_why})
	var officer_line := str(_outcome_result.get("officerLine", "")).strip_edges()
	if not officer_line.is_empty():
		verdict_display += "\n\n" + str(
			tr(&"hud.m3r.outcome.officer_line")
		).format({"line": officer_line})
	_outcome_verdict_label.text = verdict_display
	_outcome_vouch_label.text = str(tr(&"hud.m3r.outcome.vouches")).format({
		"count": _outcome_vouch_count(),
		"required": 4,
	})
	_outcome_presented_testimonies.clear()
	var body_lines: Array[String] = [str(tr(&"hud.m3r.outcome.testimonies"))]
	for actor_id in OUTCOME_ACTOR_IDS:
		var testimony := _outcome_testimony(actor_id)
		var line := str(testimony.get("testimony", "")).strip_edges()
		if line.is_empty():
			line = str(tr(&"hud.m3r.outcome.testimony_missing"))
		var contact_basis := str(testimony.get("contactBasis", ""))
		var contact_basis_label := ""
		if contact_basis in [
			"meaningful_firsthand",
			"limited_firsthand",
			"never_conversed",
		]:
			contact_basis_label = str(
				tr("hud.m3r.outcome.contact_basis.%s" % contact_basis)
			)
		var displayed_testimony := line
		if not contact_basis_label.is_empty():
			displayed_testimony = "%s\n%s" % [contact_basis_label, line]
		var actor_name := _actor_label(actor_id)
		body_lines.append(str(tr(&"hud.m3r.outcome.testimony_entry")).format({
			"actor": actor_name,
			"testimony": displayed_testimony,
		}))
		_outcome_presented_testimonies.append({
			"actorId": actor_id,
			"actor": actor_name,
			"testimony": line,
			"contactBasis": contact_basis,
			"contactBasisLabel": contact_basis_label,
			"evidencedVouch": (
				str(testimony.get("appliedStance", "")) == "vouch"
				and not _array_or_empty(testimony.get("citedMemoryIds")).is_empty()
			),
		})
	_outcome_presented_recap = _outcome_recap()
	_outcome_recap_lines.clear()
	for recap_entry in _outcome_presented_recap:
		_outcome_recap_lines.append(str(recap_entry.get("line", "")))
	body_lines.append("")
	body_lines.append(str(tr(&"hud.m3r.outcome.recap")))
	body_lines.append(str(tr(&"hud.m3r.outcome.evidence_counts")).format({
		"records": _array_or_empty(_outcome_result.get("citedRecordIds")).size(),
		"ledger": _array_or_empty(_outcome_result.get("citedLedgerEventIds")).size(),
	}))
	if _outcome_presented_recap.is_empty():
		body_lines.append(str(tr(&"hud.m3r.outcome.recap_empty")))
	else:
		for recap_entry in _outcome_presented_recap:
			var actor_id := str(recap_entry.get("actorId", ""))
			body_lines.append(str(tr(&"hud.m3r.outcome.recap_entry")).format({
				"kind": tr(
					"hud.m3r.outcome.recap.kind.%s"
					% str(recap_entry.get("kind", "verdict"))
				),
				"actor": (
					_actor_label(actor_id)
					if not actor_id.is_empty()
					else tr(&"hud.m3r.outcome.recap.actor_none")
				),
				"entry": str(recap_entry.get("line", "")),
				"sources": str(tr(&"hud.m3r.outcome.recap.source_count")).format({
					"count": int(recap_entry.get("sourceCount", 0)),
				}),
			}))
	_outcome_body.text = "\n\n".join(body_lines)
	_restart_button.text = str(tr(&"hud.m3r.outcome.restart"))
	_restart_button.disabled = _outcome_busy


func _outcome_vouch_count() -> int:
	return int(_outcome_result.get("evidencedVouchCount", 0))


func _outcome_testimony(actor_id: String) -> Dictionary:
	for value in _array_or_empty(_outcome_result.get("residentAssessments")):
		if not value is Dictionary:
			continue
		var testimony := value as Dictionary
		if str(testimony.get("actorId", "")) != actor_id:
			continue
		var normalized := testimony.duplicate(true)
		normalized["testimony"] = str(testimony.get("testimonyLine", ""))
		return normalized
	return {}


func _outcome_recap() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for value in _array_or_empty(_outcome_result.get("recap")):
		if not value is Dictionary:
			continue
		var entry := value as Dictionary
		var line := str(entry.get("line", "")).strip_edges()
		if line.is_empty():
			continue
		var kind := str(entry.get("kind", "verdict"))
		if kind not in ["defense", "testimony", "record", "ledger", "verdict"]:
			kind = "verdict"
		var actor_value: Variant = entry.get("actorId", null)
		var source_ids := _array_or_empty(entry.get("sourceIds"))
		result.append({
			"kind": kind,
			"actorId": "" if actor_value == null else str(actor_value),
			"line": line,
			"sourceCount": source_ids.size(),
			"sourceIds": source_ids,
		})
	return result


func _outcome_provider_meta() -> Dictionary:
	return _dictionary_or_empty(_outcome_result.get("proposalMeta"))


func _populate_ui_scale_options() -> void:
	_ui_scale_option.clear()
	for value in UI_SCALE_OPTIONS:
		_ui_scale_option.add_item("%d%%" % roundi(value * 100.0))


func _apply_localized_text() -> void:
	_start_hint.text = tr(&"hud.m3r.start_hint")
	_log_title.text = tr(&"hud.m3r.log.title")
	_log_busy_label.text = tr(&"hud.m3r.log.loading")
	_close_log_button.text = tr(&"hud.m3r.log.close")
	_invert_y_check.text = tr(&"hud.settings.invert_y")
	_close_settings_button.text = tr(&"hud.settings.return")
	_settings_title.text = tr(&"hud.settings.title")
	_sensitivity_label.text = tr(&"hud.settings.look_sensitivity")
	_fov_label.text = tr(&"hud.settings.fov")
	_ui_scale_label.text = tr(&"hud.settings.ui_scale")
	_master_volume_label.text = tr(&"hud.settings.master_volume")
	_sfx_volume_label.text = tr(&"hud.settings.sfx_volume")
	_refresh_language_label()
	_refresh_thinking_label()
	if _hesitation_active:
		_refresh_hesitation_timer_text()
	_conversation_free_input.placeholder_text = str(
		tr(&"hud.m3r.conversation.input_placeholder")
	).format({"limit": _conversation_free_input.max_length})
	_conversation_submit_button.text = tr(&"hud.m3r.conversation.submit")
	_refresh_input_feedback()
	_refresh_retry_button_text()
	_refresh_stance_label()
	_refresh_provider_label()
	_refresh_encountered_stances()
	_refresh_log_body()
	_refresh_ambient_subtitle_text()
	_refresh_contact_cue()
	_refresh_provider_failure()
	if _outcome_visible:
		_refresh_outcome()
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


func _refresh_input_feedback() -> void:
	if not is_instance_valid(_conversation_free_input) or not _conversation_input_row.visible:
		return
	var limit := _conversation_free_input.max_length
	var key := (
		&"hud.m3r.conversation.input_limit_reached"
		if _input_limit_rejected
		else &"hud.m3r.conversation.input_count"
	)
	_set_status(str(tr(key)).format({
		"count": _conversation_free_input.text.length(),
		"limit": limit,
	}))


func _refresh_retry_button_text() -> void:
	_end_conversation_button.text = tr(
		&"hud.m3r.conversation.retry_start"
		if _retry_button_mode == &"start"
		else &"hud.m3r.conversation.retry_end"
	)


func _refresh_stance_label() -> void:
	if not is_instance_valid(_conversation_stance_label):
		return
	if _current_stance.is_empty():
		_conversation_stance_label.visible = false
		_conversation_stance_label.text = ""
		return
	_conversation_stance_label.visible = true
	if _last_stance_judgment.is_empty():
		_conversation_stance_label.text = "%s · %s" % [
			tr(&"hud.m3r.stance.header"),
			_stance_text(_current_stance),
		]
		return
	_conversation_stance_label.text = _stance_judgment_text(_last_stance_judgment)


func _stance_judgment_text(judgment: Dictionary) -> String:
	var before := str(judgment.get("stanceBefore", _current_stance))
	var after := str(judgment.get("stanceAfter", _current_stance))
	if before != after:
		return str(tr(&"hud.m3r.stance.transition")).format({
			"before": _stance_text(before),
			"after": _stance_text(after),
		})
	var shift_key := &"hud.m3r.stance.shift.unchanged"
	var suspicion_delta := int(judgment.get("suspicionDelta", 0))
	if suspicion_delta < 0:
		shift_key = &"hud.m3r.stance.shift.more_trusting"
	elif suspicion_delta > 0:
		shift_key = &"hud.m3r.stance.shift.more_wary"
	return str(tr(shift_key)).format({"stance": _stance_text(after)})


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
		_provider_failure = _normalize_provider_failure({
			"profileId": str(_provider_meta.get("profileId", "unknown")),
			"reason": str(_provider_meta.get("fallbackReason", "unknown")),
			"purpose": "conversation_turn",
			"operationKey": "legacy-fallback-meta",
		})
		_provider_failure_can_retry = false
		_provider_failure_can_restart = false
		_provider_failure_busy_action = ""
		_provider_failure_restart_error = false
		_provider_failure_retry_button.disabled = false
		_provider_failure_restart_button.disabled = false
		_provider_failure_status.text = ""
		_provider_failure_status.visible = false
		_provider_failure_panel.visible = true
		_refresh_provider_failure()
		_focus_provider_failure_action()
		_provider_meta = {}
		_conversation_provider_label.text = ""
		_conversation_provider_label.visible = false
		return
	_conversation_provider_label.text = ""
	_conversation_provider_label.visible = false


func _provider_failure_reason_text(failure: Dictionary) -> String:
	var reason := str(failure.get("reason", "unknown"))
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
	return str(tr("hud.m3r.provider.reason.%s" % reason))


func _refresh_provider_failure() -> void:
	if not is_instance_valid(_provider_failure_panel) or _provider_failure.is_empty():
		return
	_provider_failure_title.text = str(tr(&"hud.m3r.provider_failure.title"))
	_provider_failure_body.text = str(tr(&"hud.m3r.provider_failure.body"))
	_provider_failure_reason.text = str(
		tr(&"hud.m3r.provider_failure.reason")
	).format({"reason": _provider_failure_reason_text(_provider_failure)})
	_provider_failure_retry_button.visible = _provider_failure_can_retry
	_provider_failure_retry_button.text = str(tr(
		&"hud.m3r.provider_failure.retrying"
		if _provider_failure_busy_action == "retry"
		else &"hud.m3r.provider_failure.retry"
	))
	_provider_failure_restart_button.visible = _provider_failure_can_restart
	_provider_failure_restart_button.text = str(tr(
		&"hud.m3r.provider_failure.restarting"
		if _provider_failure_busy_action == "restart"
		else &"hud.m3r.provider_failure.restart"
	))
	_provider_failure_status.text = (
		str(tr(&"hud.m3r.provider_failure.restart_error"))
		if _provider_failure_restart_error
		else ""
	)
	_provider_failure_status.visible = _provider_failure_restart_error


func _normalize_provider_failure(failure: Dictionary) -> Dictionary:
	var reason := str(failure.get("reason", failure.get("fallbackReason", "unknown")))
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
	return {
		"profileId": str(failure.get("profileId", "unknown")),
		"reason": reason,
		"purpose": str(failure.get("purpose", "unknown")),
		"operationKey": str(failure.get("operationKey", "")),
	}


func _provider_failure_from_result(result: Dictionary) -> Dictionary:
	var direct_value: Variant = result.get("providerFailure")
	if direct_value is Dictionary:
		return _normalize_provider_failure(direct_value as Dictionary)
	var meta := _dictionary_or_empty(result.get("proposalMeta"))
	if str(meta.get("transport", "")) == "fallback" or bool(meta.get("usedFallback", false)):
		return _normalize_provider_failure(meta)
	return {}


func _refresh_encountered_stances() -> void:
	if not is_instance_valid(_encountered_stance_label):
		return
	if _social_view.is_empty():
		_encountered_stance_panel.visible = false
		_encountered_stance_label.text = ""
		return
	var lines: Array[String] = [_hearing_text(), _pressure_text(), ""]
	var residents := _encountered_residents()
	if not residents.is_empty():
		lines.append(str(tr(&"hud.m3r.encountered_stances.title")))
	for resident in residents:
		var actor_id := str(resident.get("actorId", ""))
		lines.append(
			str(tr(&"hud.m3r.encountered_stances.entry")).format({
				"actor": _actor_label(actor_id),
				"stance": _stance_text(str(resident.get("stance", "uncertain"))),
			})
		)
	if not _last_stance_judgment.is_empty():
		lines.append("")
		lines.append(str(tr(&"hud.m3r.stance.latest")).format({
			"actor": _actor_label(str(_last_stance_judgment.get("actorId", ""))),
			"shift": _stance_judgment_text(_last_stance_judgment),
		}))
	lines.append("")
	lines.append(str(tr(&"hud.m3r.log.hint")))
	_encountered_stance_label.text = "\n".join(lines)
	_encountered_stance_panel.visible = (
		not _conversation_visible
		and not _settings_visible
		and not _log_visible
		and not _outcome_visible
	)


func _encountered_stance_snapshot() -> Array:
	var result: Array = []
	for entry in _encountered_residents():
		var actor_id := str(entry.get("actorId", ""))
		result.append({
			"actorId": actor_id,
			"title": _actor_label(actor_id),
			"stance": str(entry.get("stance", "uncertain")),
			"summary": "",
		})
	return result


func _encountered_residents() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for value in _array_or_empty(_social_view.get("encounteredResidents")):
		if value is Dictionary:
			result.append((value as Dictionary).duplicate(true))
	result.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return str(a.get("actorId", "")) < str(b.get("actorId", ""))
	)
	return result


func _hearing_text() -> String:
	var hearing := _dictionary_or_empty(_social_view.get("hearing"))
	if bool(hearing.get("due", false)):
		return str(tr(&"hud.m3r.hearing.due"))
	var at_seconds := maxf(0.0, float(hearing.get("atSeconds", 0.0)))
	var minutes := maxi(0, roundi(at_seconds / 60.0))
	return str(tr(&"hud.m3r.hearing.schedule")).format({"minutes": minutes})


func _pressure_snapshot() -> Dictionary:
	var pressure := _dictionary_or_empty(_social_view.get("pressure"))
	var band := str(pressure.get("band", "low"))
	if band not in ["low", "raised", "high"]:
		band = "low"
	return {
		"band": band,
		"summary": str(tr("hud.m3r.pressure.band.%s" % band)),
	}


func _pressure_text() -> String:
	var pressure := _pressure_snapshot()
	return str(tr(&"hud.m3r.pressure.format")).format({
		"band": str(pressure.get("summary", "")),
	})


func _refresh_log_body() -> void:
	if not is_instance_valid(_log_body):
		return
	var sections: Array[String] = []
	var pressure := _pressure_snapshot()
	var pressure_reason := _encountered_pressure_reason()
	if not pressure_reason.is_empty():
		sections.append("\n\n".join([
			str(tr(&"hud.m3r.log.section.pressure")),
			str(tr(&"hud.m3r.log.pressure_entry")).format({
				"band": str(pressure.get("summary", "")),
				"reason": pressure_reason,
			}),
		]))
	var residents := _encountered_residents()
	if not residents.is_empty():
		var lines: Array[String] = [str(tr(&"hud.m3r.log.section.stances"))]
		for resident in residents:
			lines.append(str(tr(&"hud.m3r.log.stance_entry")).format({
				"actor": _actor_label(str(resident.get("actorId", ""))),
				"stance": _stance_text(str(resident.get("stance", "uncertain"))),
				"why": str(resident.get("whyLine", "")),
			}))
			var provenance_text := _provenance_text(
				_dictionary_or_empty(resident.get("provenance"))
			)
			if not provenance_text.is_empty():
				lines.append(provenance_text)
		sections.append("\n\n".join(lines))

	var questions := _array_or_empty(_social_view.get("openQuestions"))
	if not questions.is_empty():
		var lines: Array[String] = [str(tr(&"hud.m3r.log.section.questions"))]
		for value in questions:
			if not value is Dictionary:
				continue
			var question := value as Dictionary
			var status := str(question.get("status", "open"))
			if status not in ["open", "resolved"]:
				status = "open"
			lines.append(str(tr(&"hud.m3r.log.question_entry")).format({
				"status": tr("hud.m3r.log.question_status.%s" % status),
				"text": str(question.get("text", "")),
				"why": str(question.get("whyLine", "")),
			}))
			var provenance_text := _provenance_text(
				_dictionary_or_empty(question.get("provenance"))
			)
			if not provenance_text.is_empty():
				lines.append(provenance_text)
		sections.append("\n\n".join(lines))

	var records := _array_or_empty(_social_view.get("encounteredRecords"))
	if not records.is_empty():
		var lines: Array[String] = [str(tr(&"hud.m3r.log.section.records"))]
		for value in records:
			if not value is Dictionary:
				continue
			var record := value as Dictionary
			lines.append(str(tr(&"hud.m3r.log.record_entry")).format({
				"author": _actor_label(str(record.get("authorActorId", ""))),
				"body": str(record.get("stateBody", "")),
			}))
			var provenance_text := _provenance_text(
				_dictionary_or_empty(record.get("provenance"))
			)
			if not provenance_text.is_empty():
				lines.append(provenance_text)
		sections.append("\n\n".join(lines))
	_log_body.text = (
		str(tr(&"hud.m3r.log.empty")) if sections.is_empty()
		else "\n\n\n".join(sections)
	)


func _encountered_pressure_reason() -> String:
	var pressure := _dictionary_or_empty(_social_view.get("pressure"))
	var why_value: Variant = pressure.get("latestEncounteredWhyLine", null)
	return "" if why_value == null else str(why_value).strip_edges()


func _provenance_text(provenance: Dictionary) -> String:
	if provenance.is_empty():
		return ""
	var origin_kind := str(provenance.get("originKind", ""))
	if origin_kind not in ["speech", "record"]:
		return ""
	var source := str(provenance.get("sourceExcerpt", "")).strip_edges()
	var why := str(provenance.get("whyLine", "")).strip_edges()
	var reason := ""
	if not why.is_empty() and why != source:
		reason = str(tr(&"hud.m3r.log.provenance.reason")).format({"why": why})
	return str(tr("hud.m3r.log.provenance.%s" % origin_kind)).format({
		"origin": _actor_label(str(provenance.get("originActorId", ""))),
		"recipient": _actor_label(str(provenance.get("recipientActorId", ""))),
		"source": source,
		"reason": reason,
	}).strip_edges()


func _disclosed_stance(actor_id: String) -> String:
	return str(_disclosed_resident(actor_id).get("stance", ""))


func _disclosed_resident(actor_id: String) -> Dictionary:
	for resident in _encountered_residents():
		if str(resident.get("actorId", "")) == actor_id:
			return resident.duplicate(true)
	return {}


func _actor_label(actor_id: String) -> String:
	if actor_id.is_empty():
		return str(tr(&"hud.m3r.conversation.speaker_fallback"))
	if actor_id.to_lower() in ["player", "player_3d"]:
		return str(tr(&"hud.m3r.resident.player"))
	var key := "npc.%s.label" % actor_id
	var localized := str(tr(key))
	return str(tr(&"hud.m3r.resident.unknown")) if localized == key else localized


func _stance_text(stance: String) -> String:
	var normalized := stance if stance in ["oppose", "uncertain", "vouch"] else "uncertain"
	return str(tr("hud.m3r.stance.%s" % normalized))


func _show_next_ambient_subtitle() -> void:
	if _ambient_subtitle_queue.is_empty():
		_current_ambient_subtitle = {}
		_ambient_subtitle_remaining = 0.0
		_refresh_ambient_subtitle_visibility()
		return
	_current_ambient_subtitle = _ambient_subtitle_queue.pop_front()
	var line := str(_current_ambient_subtitle.get("line", ""))
	_ambient_subtitle_remaining = clampf(
		AMBIENT_SUBTITLE_MIN_SECONDS
		+ float(line.length()) * AMBIENT_SUBTITLE_SECONDS_PER_CHARACTER,
		AMBIENT_SUBTITLE_MIN_SECONDS,
		AMBIENT_SUBTITLE_MAX_SECONDS
	)
	_refresh_ambient_subtitle_text()
	# Main3D synchronously revalidates semantic audibility from the emitted
	# candidate before the panel is allowed to become visible or play audio.
	_ambient_subtitle_panel.visible = false
	ambient_subtitle_started.emit(_current_ambient_subtitle.duplicate(true))
	_refresh_ambient_subtitle_visibility()


func _refresh_ambient_subtitle_text() -> void:
	if not is_instance_valid(_ambient_subtitle_label):
		return
	if _current_ambient_subtitle.is_empty():
		_ambient_subtitle_label.text = ""
		return
	var actor_id := str(_current_ambient_subtitle.get("speakerActorId", ""))
	var direction := str(_current_ambient_subtitle.get("direction", "center"))
	if direction not in ["left", "center", "right", "behind"]:
		direction = "center"
	_ambient_subtitle_label.text = str(
		tr(&"hud.m3r.ambient_subtitle.format")
	).format({
		"speaker": _actor_label(actor_id),
		"direction": tr("hud.m3r.ambient_subtitle.direction.%s" % direction),
		"line": str(_current_ambient_subtitle.get("line", "")),
	})


func _refresh_ambient_subtitle_visibility() -> void:
	if not is_instance_valid(_ambient_subtitle_panel):
		return
	_ambient_subtitle_panel.visible = (
		not _current_ambient_subtitle.is_empty()
		and not _conversation_visible
		and not _settings_visible
		and not _log_visible
		and not _outcome_visible
	)


func _refresh_contact_cue() -> void:
	if not is_instance_valid(_contact_cue_panel) or not is_instance_valid(_contact_cue_label):
		return
	if not _hearing_opening_state.is_empty():
		_contact_cue_label.text = str(tr(
			&"hud.m3r.hearing.opening_retry"
			if _hearing_opening_state == "retry"
			else &"hud.m3r.hearing.opening"
		))
		_contact_cue_panel.visible = (
			not _conversation_visible
			and not _settings_visible
			and not _log_visible
			and not _outcome_visible
		)
		return
	if _contact_cue_id.is_empty() or _contact_cue_actor_id.is_empty():
		_contact_cue_label.text = ""
		_contact_cue_panel.visible = false
		return
	_contact_cue_label.text = str(tr(
		&"hud.m3r.contact.ready"
		if _contact_cue_ready
		else &"hud.m3r.contact.approaching"
	)).format({
		"speaker": _actor_label(_contact_cue_actor_id),
	})
	_contact_cue_panel.visible = (
		not _conversation_visible
		and not _settings_visible
		and not _log_visible
		and not _outcome_visible
	)


func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}


func _ensure_runtime_theme() -> void:
	if _runtime_theme != null:
		return
	_runtime_theme = $Overlay.theme.duplicate(true) as Theme
	$Overlay.theme = _runtime_theme


func _apply_export_font() -> void:
	if not is_instance_valid(_localization) or not _localization.has_method("export_font"):
		return
	var selected_font: Variant = _localization.call("export_font")
	if not selected_font is Font:
		push_error("HUD3D could not resolve the bundled export font.")
		return
	_ensure_runtime_theme()
	_runtime_theme.default_font = selected_font as Font


func _array_or_empty(value: Variant) -> Array:
	return (value as Array).duplicate(true) if value is Array else []


func _populate_language_options() -> void:
	var selected_locale := str(_localization.call("locale"))
	_language_options.clear()
	_language_option.clear()
	var locales_value: Variant = _localization.call("supported_locales")
	if not locales_value is Array:
		return
	for entry_value in locales_value as Array:
		if not entry_value is Dictionary:
			continue
		var entry := entry_value as Dictionary
		var locale_name := str(entry.get("presentationId", ""))
		var label_key := str(entry.get("labelKey", ""))
		if locale_name.is_empty() or label_key.is_empty():
			continue
		_language_options.append(locale_name)
		_language_option.add_item(tr(label_key))
	_select_language(selected_locale)


func _select_float_option(option: OptionButton, values: Array[float], target: float) -> void:
	var selected_index := 0
	for index in values.size():
		if is_equal_approx(values[index], target):
			selected_index = index
			break
	option.select(selected_index)


func _select_language(locale_name: String) -> void:
	var normalized := str(_localization.call("presentation_locale", locale_name))
	for index in _language_options.size():
		if _language_options[index] == normalized:
			_language_option.select(index)
			return
	if not _language_options.is_empty():
		_language_option.select(0)


func _selected_language() -> String:
	if _language_option.selected < 0 or _language_option.selected >= _language_options.size():
		return ""
	return _language_options[_language_option.selected]


func _refresh_language_label() -> void:
	_language_label.text = tr(
		&"hud.settings.language_next_run"
		if _language_applies_next_run
		else &"hud.settings.language"
	)
