extends CanvasLayer
## M2 HUD: a restrained, diegetic record surface over the warm pixel world.
## The pixel world is the visual anchor; panels stay small, quiet, and
## content-sized. Cold authority color enters only through pressure, records,
## and the Station outcome. Provider/source detail and display settings live
## behind Esc (settings) and Tab/E (inspect), never in permanent chrome.

const WorldTextOverlaysScript := preload("res://scripts/ui/world_text_overlays.gd")

signal choice_submitted(choice_id: String)
signal free_input_submitted(text: String)
signal hesitation_submitted
signal conversation_closed
signal restart_requested
signal resolution_requested(preset_id: String)
signal ui_scale_requested(scale: float)

const HESITATION_SECONDS := 6.0
const INPUT_MAX_LENGTH := 120
const HUD_REFERENCE_HEIGHT := 720.0
const INK := Color("#ece8dc")
const MUTED := Color("#a9b0b8")
const WARM := Color("#e2a33d")
const COLD := Color("#6f8fbd")
const DANGER := Color("#c8645a")
const PAPER := Color(0.075, 0.083, 0.098, 0.96)
const PAPER_SOFT := Color(0.105, 0.112, 0.126, 0.94)

var _root: Control
var _world_text_overlays: Control
var _pressure_panel: PanelContainer
var _location_label: Label
var _suspicion_label: Label
var _suspicion_bar: ProgressBar
var _report_label: Label
var _report_bar: ProgressBar
var _ledger_label: Label
var _fallback_badge: Label
var _debug_badge: Label

var _conversation_panel: PanelContainer
var _speaker_label: Label
var _prompt_label: Label
var _prompt_scroll: ScrollContainer
var _timer_label: Label
var _timer_bar: ProgressBar
var _choice_buttons: Array[Button] = []
var _input: LineEdit
var _submit_button: Button
var _stamp: Label
var _hesitation_timer: Timer

var _inspect_panel: PanelContainer
var _inspect_title: Label
var _inspect_body: Label
var _inspect_scroll: ScrollContainer

var _hint_panel: PanelContainer
var _hint_label: Label

var _outcome_layer: Control
var _route_tag: Label
var _outcome_title: Label
var _outcome_body: Label
var _closing_action: Label
var _cited_label: Label
var _restart_button: Button

var _settings_panel: PanelContainer
var _resolution_option: OptionButton
var _resolution_ids: Array[String] = []
var _ui_scale_option: OptionButton
var _ui_scale_values: Array[float] = []
var _mode_label: Label

var _busy := false
var _latest_ledger_events: Array = []
var _judgment_reasons: Array[String] = []
var _agent_actions: Array[String] = []
var _status_revision := 0
var _ui_scale := 1.0
var _user_scale := 1.0
var _provider_fallback := false
var _committed_prompt := ""
var _typewriter_tween: Tween = null
var _thinking_tween: Tween = null
const TYPEWRITER_CHARS_PER_SECOND := 36.0

func _ready() -> void:
	layer = 20
	_ui_scale = _calculate_ui_scale()
	_build_ui()
	get_viewport().size_changed.connect(_apply_ui_scale)
	set_process(true)

func _process(_delta: float) -> void:
	if not _conversation_panel.visible or _hesitation_timer.is_stopped():
		return
	var remaining := maxf(_hesitation_timer.time_left, 0.0)
	_timer_bar.value = HESITATION_SECONDS - remaining
	_timer_label.text = _t("hud.timer.seconds", {"seconds": "%0.1f" % remaining})

func _unhandled_input(event: InputEvent) -> void:
	if _settings_panel.visible:
		if event.is_action_pressed("cancel"):
			hide_settings()
			get_viewport().set_input_as_handled()
		return
	if _outcome_layer.visible:
		if event.is_action_pressed("ui_accept"):
			_request_restart()
			get_viewport().set_input_as_handled()
		return
	if _inspect_panel.visible and (event.is_action_pressed("cancel") or event.is_action_pressed("interact")):
		hide_inspection()
		get_viewport().set_input_as_handled()
		return
	if _conversation_panel.visible:
		if event.is_action_pressed("cancel"):
			hide_conversation()
			conversation_closed.emit()
			get_viewport().set_input_as_handled()
			return
		if _input.has_focus():
			return
		for index in range(3):
			if event.is_action_pressed("choice_%d" % (index + 1)):
				_submit_choice(index)
				get_viewport().set_input_as_handled()
				return
		return
	if event.is_action_pressed("cancel"):
		show_settings()
		get_viewport().set_input_as_handled()

func _build_ui() -> void:
	_root = Control.new()
	_root.name = "Root"
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_root)
	_world_text_overlays = WorldTextOverlaysScript.new()
	_world_text_overlays.name = "WorldTextOverlays"
	_root.add_child(_world_text_overlays)
	_world_text_overlays.call("set_ui_scale", _ui_scale)
	_build_pressure_panel()
	_build_hint_panel()
	_build_conversation_panel()
	_build_inspect_panel()
	_build_outcome_panel()
	_build_settings_panel()

## Compact top-left case-file chip: location, meters, one transient status
## line. No subtitle, provider string, or display selector in permanent chrome.
func _build_pressure_panel() -> void:
	var corner := _margin(10, 8, 0, 0)
	corner.name = "PressureCorner"
	corner.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	corner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(corner)
	_pressure_panel = PanelContainer.new()
	_pressure_panel.name = "PressureLine"
	_pressure_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_pressure_panel.add_theme_stylebox_override("panel", _panel_style(PAPER, COLD, 0.30, 4, 4))
	corner.add_child(_pressure_panel)
	var margin := _margin(10, 6, 10, 6)
	_pressure_panel.add_child(margin)
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 3)
	margin.add_child(rows)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 8)
	rows.add_child(header)
	_location_label = _label(_t("world.location.store"), 14, INK)
	header.add_child(_location_label)
	_fallback_badge = _label(_t("hud.mode.fixture"), 10, Color("#91b7a0"))
	_fallback_badge.visible = false
	header.add_child(_fallback_badge)
	_debug_badge = _label(_t("hud.debug.active"), 10, Color("#ef72cf"))
	_debug_badge.visible = false
	header.add_child(_debug_badge)

	var meters := HBoxContainer.new()
	meters.add_theme_constant_override("separation", 6)
	rows.add_child(meters)
	_suspicion_label = _metric_label(_t("hud.pressure.suspicion"))
	meters.add_child(_suspicion_label)
	_suspicion_bar = _meter(WARM)
	meters.add_child(_suspicion_bar)
	_report_label = _metric_label(_t("hud.pressure.report"))
	meters.add_child(_report_label)
	_report_bar = _meter(COLD)
	meters.add_child(_report_bar)

	_ledger_label = _label(_t("hud.ledger.open_hint"), 12, MUTED)
	_ledger_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	rows.add_child(_ledger_label)

func _build_hint_panel() -> void:
	var anchor := _margin(0, 0, 0, 10)
	anchor.name = "HintAnchor"
	anchor.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	anchor.grow_horizontal = Control.GROW_DIRECTION_BOTH
	anchor.grow_vertical = Control.GROW_DIRECTION_BEGIN
	anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(anchor)
	_hint_panel = PanelContainer.new()
	_hint_panel.name = "ApproachHint"
	_hint_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hint_panel.add_theme_stylebox_override("panel", _panel_style(PAPER, WARM, 0.24, 3, 3))
	anchor.add_child(_hint_panel)
	var margin := _margin(12, 4, 12, 4)
	_hint_panel.add_child(margin)
	_hint_label = _label(_t("hud.prompt.approach"), 13, INK)
	_hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hint_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	margin.add_child(_hint_label)

## Bottom sheet, not a modal wall: ~68% width, bottom 38% height, so the
## speaker and the rest of the room stay visible while answering.
func _build_conversation_panel() -> void:
	_conversation_panel = PanelContainer.new()
	_conversation_panel.name = "ConversationPanel"
	_set_rect(_conversation_panel, 0.16, 0.64, 0.84, 0.975)
	_conversation_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_conversation_panel.add_theme_stylebox_override("panel", _panel_style(PAPER, WARM, 0.42, 5, 5))
	_conversation_panel.visible = false
	_root.add_child(_conversation_panel)
	var margin := _margin(12, 8, 12, 8)
	_conversation_panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 6)
	column.add_child(header)
	_speaker_label = _label("", 14, WARM)
	_speaker_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(_speaker_label)
	_stamp = _label(_t("hud.conversation.recorded_stamp"), 11, Color("#e8b46c"))
	_stamp.visible = false
	_stamp.rotation = -0.08
	header.add_child(_stamp)
	_timer_label = _label(_t("hud.timer.seconds", {"seconds": "6.0"}), 10, MUTED)
	_set_scaled_minimum(_timer_label, Vector2(42, 0))
	_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	header.add_child(_timer_label)

	_prompt_scroll = ScrollContainer.new()
	_prompt_scroll.name = "GeneratedPromptScroll"
	_prompt_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_prompt_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_prompt_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_set_scaled_minimum(_prompt_scroll, Vector2(0, 30))
	column.add_child(_prompt_scroll)
	_prompt_label = _label("", 15, INK)
	_prompt_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_prompt_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_prompt_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_prompt_scroll.add_child(_prompt_label)

	_timer_bar = _meter(COLD)
	_timer_bar.max_value = HESITATION_SECONDS
	_timer_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_set_scaled_minimum(_timer_bar, Vector2(70, 3))
	column.add_child(_timer_bar)

	for index in range(3):
		var button := Button.new()
		button.name = "Choice%d" % (index + 1)
		_set_scaled_minimum(button, Vector2(0, 26))
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.focus_mode = Control.FOCUS_ALL
		_set_scaled_font(button, 14)
		_apply_button_styles(button, PAPER_SOFT, WARM)
		# Submit on activation start so both mouse-down and keyboard accept remain
		# reliable while the resizable window remaps the release point.
		button.button_down.connect(_submit_choice.bind(index))
		column.add_child(button)
		_choice_buttons.append(button)

	var input_row := HBoxContainer.new()
	input_row.add_theme_constant_override("separation", 5)
	column.add_child(input_row)
	_input = LineEdit.new()
	_input.name = "RecordedStatementInput"
	_input.max_length = INPUT_MAX_LENGTH
	_input.placeholder_text = _t("hud.conversation.input_placeholder")
	_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_set_scaled_font(_input, 14)
	_input.add_theme_color_override("font_color", INK)
	_input.add_theme_color_override("font_placeholder_color", Color(MUTED, 0.7))
	_input.add_theme_stylebox_override("normal", _input_style(false))
	_input.add_theme_stylebox_override("focus", _input_style(true))
	_input.text_submitted.connect(_submit_text)
	input_row.add_child(_input)
	_submit_button = Button.new()
	_submit_button.text = _t("hud.conversation.submit")
	_set_scaled_minimum(_submit_button, Vector2(52, 24))
	_set_scaled_font(_submit_button, 13)
	_apply_button_styles(_submit_button, Color("#263143"), COLD)
	_submit_button.pressed.connect(func() -> void: _submit_text(_input.text))
	input_row.add_child(_submit_button)

	_hesitation_timer = Timer.new()
	_hesitation_timer.one_shot = true
	_hesitation_timer.wait_time = HESITATION_SECONDS
	_hesitation_timer.timeout.connect(_on_hesitation_timeout)
	add_child(_hesitation_timer)

func _build_inspect_panel() -> void:
	_inspect_panel = PanelContainer.new()
	_inspect_panel.name = "InspectPanel"
	_set_rect(_inspect_panel, 0.58, 0.16, 0.975, 0.78)
	_inspect_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_inspect_panel.add_theme_stylebox_override("panel", _panel_style(PAPER, COLD, 0.38, 4, 4))
	_inspect_panel.visible = false
	_root.add_child(_inspect_panel)
	var margin := _margin(12, 9, 12, 9)
	_inspect_panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)
	_inspect_title = _label(_t("hud.inspect.title"), 13, COLD)
	column.add_child(_inspect_title)
	var rule := HSeparator.new()
	column.add_child(rule)
	_inspect_scroll = ScrollContainer.new()
	_inspect_scroll.name = "InspectScroll"
	_inspect_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_inspect_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_inspect_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(_inspect_scroll)
	_inspect_body = _label("", 11, INK)
	_inspect_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_inspect_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_inspect_scroll.add_child(_inspect_body)
	var close_hint := _label(_t("hud.inspect.close"), 9, MUTED)
	close_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	column.add_child(close_hint)

func _build_outcome_panel() -> void:
	_outcome_layer = Control.new()
	_outcome_layer.name = "OutcomePanel"
	_outcome_layer.mouse_filter = Control.MOUSE_FILTER_STOP
	_outcome_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_outcome_layer.visible = false
	_root.add_child(_outcome_layer)
	var dim := ColorRect.new()
	dim.color = Color(0.035, 0.045, 0.06, 0.66)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_outcome_layer.add_child(dim)
	var panel := PanelContainer.new()
	_set_rect(panel, 0.28, 0.22, 0.72, 0.80)
	panel.add_theme_stylebox_override("panel", _panel_style(Color("#111923"), COLD, 0.70, 6, 7))
	_outcome_layer.add_child(panel)
	var margin := _margin(18, 14, 18, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	_route_tag = _label(_t("hud.outcome.route", {"route": ""}), 10, COLD)
	column.add_child(_route_tag)
	_outcome_title = _label("", 20, INK)
	_outcome_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_outcome_title)
	_outcome_body = _label("", 12, INK)
	_outcome_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_outcome_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(_outcome_body)
	_closing_action = _label("", 10, Color("#b8c9df"))
	_closing_action.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_closing_action)
	_cited_label = _label("", 9, MUTED)
	_cited_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_cited_label)
	_restart_button = Button.new()
	_restart_button.text = _t("hud.outcome.restart")
	_set_scaled_minimum(_restart_button, Vector2(0, 28))
	_set_scaled_font(_restart_button, 12)
	_apply_button_styles(_restart_button, Color("#27364a"), COLD)
	_restart_button.pressed.connect(_request_restart)
	column.add_child(_restart_button)

## Esc settings sheet: output size, UI scale, and the honest provider line
## (profile · transport · fallback reason) live here instead of the header.
func _build_settings_panel() -> void:
	_settings_panel = PanelContainer.new()
	_settings_panel.name = "SettingsPanel"
	_settings_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	_settings_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_settings_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	_settings_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_settings_panel.add_theme_stylebox_override("panel", _panel_style(Color("#111923"), COLD, 0.55, 5, 6))
	_settings_panel.visible = false
	_root.add_child(_settings_panel)
	var margin := _margin(16, 10, 16, 10)
	_settings_panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	column.add_child(_label(_t("hud.settings.title"), 13, INK))
	column.add_child(HSeparator.new())
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 6)
	column.add_child(grid)
	grid.add_child(_label(_t("hud.settings.resolution"), 11, MUTED))
	_resolution_option = OptionButton.new()
	_resolution_option.name = "ResolutionPreset"
	_set_scaled_font(_resolution_option, 11)
	_set_scaled_minimum(_resolution_option, Vector2(110, 20))
	_apply_button_styles(_resolution_option, Color("#202733"), COLD)
	_resolution_option.item_selected.connect(_on_resolution_selected)
	grid.add_child(_resolution_option)
	grid.add_child(_label(_t("hud.settings.ui_scale"), 11, MUTED))
	_ui_scale_option = OptionButton.new()
	_ui_scale_option.name = "UiScaleOption"
	_set_scaled_font(_ui_scale_option, 11)
	_set_scaled_minimum(_ui_scale_option, Vector2(110, 20))
	_apply_button_styles(_ui_scale_option, Color("#202733"), COLD)
	_ui_scale_option.item_selected.connect(_on_ui_scale_selected)
	grid.add_child(_ui_scale_option)
	grid.add_child(_label(_t("hud.settings.provider"), 11, MUTED))
	_mode_label = _label(_t("hud.mode.fixture"), 10, COLD)
	grid.add_child(_mode_label)
	var close_hint := _label(_t("hud.settings.close"), 9, MUTED)
	close_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	column.add_child(close_hint)

func show_settings() -> void:
	_settings_panel.visible = true
	_hint_panel.visible = false
	_resolution_option.grab_focus()

func hide_settings() -> void:
	_settings_panel.visible = false
	if not is_modal():
		_hint_panel.visible = true

func show_turn(turn: Dictionary) -> void:
	_busy = false
	_inspect_panel.visible = false
	_hint_panel.visible = false
	_outcome_layer.visible = false
	_settings_panel.visible = false
	_conversation_panel.visible = true
	var actor_id := str(turn.get("speakerId", turn.get("actorId", "")))
	_speaker_label.text = _actor_name(actor_id)
	_prompt_scroll.scroll_vertical = 0
	_start_typewriter(str(turn.get("prompt", "")))
	set_provider(_dictionary_or_empty(turn.get("proposalMeta")))
	var choices: Array = turn.get("choices", [])
	for index in range(_choice_buttons.size()):
		var button := _choice_buttons[index]
		button.visible = index < choices.size()
		button.disabled = false
		if index < choices.size():
			var choice: Dictionary = choices[index]
			button.set_meta("choice_id", str(choice.get("choiceId", "")))
			button.text = "[%d]  %s" % [index + 1, str(choice.get("line", choice.get("text", "")))]
	var accepts_input := bool(turn.get("acceptsFreeInput", turn.get("allowFreeInput", false)))
	_input.visible = accepts_input
	_submit_button.visible = accepts_input
	_input.editable = accepts_input
	_input.clear()
	_stamp.visible = false
	_stamp.modulate.a = 0.0
	_timer_bar.value = 0
	_hesitation_timer.start(HESITATION_SECONDS)
	if not _choice_buttons.is_empty():
		_choice_buttons[0].call_deferred("grab_focus")

func hide_conversation() -> void:
	_hesitation_timer.stop()
	_stop_thinking_animation()
	_kill_typewriter()
	_conversation_panel.visible = false
	_busy = false
	if not _outcome_layer.visible:
		_hint_panel.visible = true

func set_busy(value: bool) -> void:
	_busy = value
	for button in _choice_buttons:
		button.disabled = value
	_input.editable = not value
	_submit_button.disabled = value
	if value:
		_hesitation_timer.stop()
		_show_thinking()
	else:
		_stop_thinking_animation()

func show_conversation_error(message: String) -> void:
	set_busy(false)
	_prompt_label.modulate = Color(1, 1, 1, 1)
	_prompt_label.text = _committed_prompt
	_status_revision += 1
	_ledger_label.text = message
	_ledger_label.modulate = DANGER
	if _conversation_panel.visible:
		_hesitation_timer.start(HESITATION_SECONDS)

func _show_thinking() -> void:
	_kill_typewriter()
	_stop_thinking_animation()
	var speaker := _speaker_label.text
	if speaker.is_empty():
		speaker = _t("hud.conversation.thinking_speaker_fallback")
	_prompt_label.text = _t("hud.conversation.thinking", {"speaker": speaker})
	_prompt_label.modulate = Color(1, 1, 1, 1)
	_thinking_tween = create_tween()
	_thinking_tween.set_loops()
	_thinking_tween.tween_property(_prompt_label, "modulate:a", 0.55, 0.55)
	_thinking_tween.tween_property(_prompt_label, "modulate:a", 1.0, 0.55)

func _stop_thinking_animation() -> void:
	if _thinking_tween != null and is_instance_valid(_thinking_tween):
		_thinking_tween.kill()
	_thinking_tween = null
	if is_instance_valid(_prompt_label):
		_prompt_label.modulate = Color(1, 1, 1, 1)

func _start_typewriter(full_text: String) -> void:
	_stop_thinking_animation()
	_kill_typewriter()
	_committed_prompt = full_text
	_prompt_label.modulate = Color(1, 1, 1, 1)
	# Long generated lines fill immediately so the prompt scroll region can
	# size itself; ordinary reply length still typewrites.
	if full_text.length() > 64:
		_prompt_label.text = full_text
		return
	_prompt_label.text = ""
	if full_text.is_empty():
		return
	var duration := clampf(float(full_text.length()) / TYPEWRITER_CHARS_PER_SECOND, 0.08, 0.85)
	_typewriter_tween = create_tween()
	_typewriter_tween.tween_method(_reveal_typewriter_chars, 0.0, float(full_text.length()), duration)

func _reveal_typewriter_chars(visible_count: float) -> void:
	_prompt_label.text = _committed_prompt.substr(
		0,
		clampi(int(round(visible_count)), 0, _committed_prompt.length())
	)

func _kill_typewriter() -> void:
	if _typewriter_tween != null and is_instance_valid(_typewriter_tween):
		_typewriter_tween.kill()
	_typewriter_tween = null

func set_pressure(suspicion: int, report_pressure: int, why_lines: Array = []) -> void:
	_suspicion_bar.value = suspicion
	_report_bar.value = report_pressure
	_suspicion_label.text = "%s %03d" % [_t("hud.pressure.suspicion"), suspicion]
	_report_label.text = "%s %03d" % [_t("hud.pressure.report"), report_pressure]
	if not why_lines.is_empty():
		for reason_value in why_lines:
			var reason := str(reason_value).strip_edges()
			if not reason.is_empty():
				_judgment_reasons.append(reason)
		while _judgment_reasons.size() > 8:
			_judgment_reasons.pop_front()
		_show_transient_status(_t("hud.pressure.reason_updated"), MUTED)
	var authority: int = maxi(suspicion, report_pressure)
	_pressure_panel.add_theme_stylebox_override(
		"panel",
		_panel_style(PAPER, DANGER if authority >= 90 else COLD, 0.65 if authority >= 90 else 0.30, 4, 4)
	)

func set_latest_ledger(event: Dictionary) -> void:
	_latest_ledger_events.append(event.duplicate(true))
	if _latest_ledger_events.size() > 8:
		_latest_ledger_events.pop_front()
	_show_transient_status(_t("hud.status.record_updated"), Color("#f4cc7d"))

## Agent steps stay quiet in normal play: successful actions already read
## through the world (bubbles, markers, records); only blocked actions and the
## inspect/ledger causality list surface here.
func show_agent_step(entry: Dictionary) -> void:
	var meta := _dictionary_or_empty(entry.get("proposalMeta"))
	set_provider(meta)
	var validation := _dictionary_or_empty(entry.get("validation"))
	var ok := bool(validation.get("ok", false))
	var result_text := "성공" if ok else "차단: %s" % str(validation.get("reason", "unknown"))
	_agent_actions.append("%s · %s → %s" % [
		str(meta.get("profileId", "provider")),
		str(entry.get("tool", "stop")),
		result_text,
	])
	while _agent_actions.size() > 8:
		_agent_actions.pop_front()
	if not ok:
		_show_transient_status(_t("hud.status.action_blocked", {"tool": str(entry.get("tool", ""))}), DANGER)

func set_location(location_id: String) -> void:
	_location_label.text = _t("world.location.%s" % location_id)

func set_mode(mode: String) -> void:
	_mode_label.text = _t("hud.mode.http" if mode == "http" else "hud.mode.fixture")
	_mode_label.modulate = COLD if mode == "http" else Color("#91b7a0")
	_fallback_badge.visible = mode != "http"
	_fallback_badge.text = _t("hud.mode.fixture")
	_fallback_badge.modulate = Color("#91b7a0")

func set_provider(meta: Dictionary) -> void:
	if meta.is_empty():
		return
	var profile := str(meta.get("profileId", "unknown"))
	var transport := str(meta.get("transport", "unknown"))
	var reason := str(meta.get("fallbackReason", ""))
	_mode_label.text = "%s · %s%s" % [
		profile,
		transport,
		" (%s)" % reason if not reason.is_empty() else "",
	]
	var fallback := bool(meta.get("usedFallback", false))
	_mode_label.modulate = DANGER if fallback else COLD
	if fallback and not _provider_fallback:
		_show_transient_status(
			_t("hud.provider.fallback", {"reason": reason if not reason.is_empty() else transport}),
			DANGER
		)
	_provider_fallback = fallback
	if fallback:
		_fallback_badge.visible = true
		_fallback_badge.text = _t("hud.provider.fallback_badge")
		_fallback_badge.modulate = DANGER

func set_debug_mode(value: bool) -> void:
	_debug_badge.visible = value
	_world_text_overlays.call("set_debug_mode", value)

## Nameplates and transient world text share one native-resolution placement
## surface. Inspect/settings/outcome own the screen while open; conversation
## stays live and is treated as an obstacle instead of hiding reactions.
func sync_world_overlays(
	actor_payloads: Array,
	prop_payloads: Array,
	world_safe_rect: Rect2,
	extra_obstacles: Array[Rect2] = []
) -> void:
	var hidden_by_modal := _inspect_panel.visible or _settings_panel.visible or _outcome_layer.visible
	_world_text_overlays.visible = not hidden_by_modal
	if hidden_by_modal:
		return
	var reserved: Array[Rect2] = []
	for control in [_pressure_panel, _hint_panel, _conversation_panel]:
		if is_instance_valid(control) and control.visible:
			reserved.append(control.get_global_rect())
	_world_text_overlays.call("sync", actor_payloads, prop_payloads, world_safe_rect, reserved, extra_obstacles)

func world_overlay_fallback_count() -> int:
	return int(_world_text_overlays.call("fallback_count"))

func configure_resolution_options(options: Array, current_id: String) -> void:
	_resolution_option.clear()
	_resolution_ids.clear()
	var selected_index := 0
	for option_value in options:
		if not option_value is Dictionary:
			continue
		var option: Dictionary = option_value
		var preset_id := str(option.get("id", ""))
		_resolution_ids.append(preset_id)
		_resolution_option.add_item(str(option.get("label", preset_id)))
		if preset_id == current_id:
			selected_index = _resolution_ids.size() - 1
	_resolution_option.select(selected_index)

func configure_ui_scale_options(options: Array, current_scale: float) -> void:
	_ui_scale_option.clear()
	_ui_scale_values.clear()
	var selected_index := 0
	for option_value in options:
		if not option_value is Dictionary:
			continue
		var option: Dictionary = option_value
		var value := float(option.get("value", 1.0))
		_ui_scale_values.append(value)
		_ui_scale_option.add_item(str(option.get("label", "%d%%" % roundi(value * 100))))
		if is_equal_approx(value, current_scale):
			selected_index = _ui_scale_values.size() - 1
	_ui_scale_option.select(selected_index)

func set_user_scale(value: float) -> void:
	_user_scale = clampf(value, 0.5, 2.0)
	_apply_ui_scale()

func _on_resolution_selected(index: int) -> void:
	if index < 0 or index >= _resolution_ids.size():
		return
	resolution_requested.emit(_resolution_ids[index])

func _on_ui_scale_selected(index: int) -> void:
	if index < 0 or index >= _ui_scale_values.size():
		return
	ui_scale_requested.emit(_ui_scale_values[index])

func set_hint(text: String) -> void:
	_hint_label.text = text
	if not is_modal():
		_hint_panel.visible = true

func show_inspection(payload: Dictionary, latest_exchange := "") -> void:
	_inspect_panel.visible = true
	_hint_panel.visible = false
	_inspect_scroll.scroll_vertical = 0
	var title := str(payload.get("title", ""))
	_inspect_title.text = "%s · %s" % [_t("hud.inspect.title"), title]
	if str(payload.get("kind", "")) == "npc":
		var reaction := str(payload.get("reaction", ""))
		var utterance := str(payload.get("utterance", latest_exchange))
		var source := str(payload.get("actionSource", ""))
		_inspect_body.text = "%s\n%s\n%s\n%s\n\n%s\n\n%s\n%s\n\n%s" % [
			str(payload.get("role", "")),
			reaction,
			_t("hud.inspect.current_action", {"action": str(payload.get("action", ""))}),
			_t("hud.inspect.action_source", {"source": source if not source.is_empty() else "—"}),
			_t("hud.pressure.exchange", {"line": utterance if not utterance.is_empty() else "—"}),
			_t("hud.inspect.judgment_reasons"),
			_recent_reasons_text(),
			_t("hud.ledger.open_hint"),
		]
	else:
		var state := str(payload.get("state", ""))
		var readers: Array = payload.get("readers", [])
		var reader_names: Array[String] = []
		for reader in readers:
			reader_names.append(_role_name(str(reader)))
		_inspect_body.text = "%s\n\n%s\n%s\n\n%s" % [
			str(payload.get("desc", "")),
			_t("hud.inspect.record", {"state": _t("state.%s" % state)}),
			_t("hud.inspect.readers", {"readers": ", ".join(reader_names)}),
			_t("hud.pressure.exchange", {"line": latest_exchange if not latest_exchange.is_empty() else "—"}),
		]

func show_ledger() -> void:
	_inspect_panel.visible = true
	_hint_panel.visible = false
	_inspect_scroll.scroll_vertical = 0
	_inspect_title.text = _t("hud.ledger.title")
	var event_lines: Array[String] = []
	for event in _latest_ledger_events:
		var event_id := str(event.get("eventId", event.get("id", "")))
		var line := str(event.get("whyLine", event.get("summary", event.get("kind", ""))))
		event_lines.append("%s  %s" % [event_id, line])
	var sections: Array[String] = []
	sections.append("\n\n".join(event_lines) if not event_lines.is_empty() else _t("hud.ledger.empty"))
	if not _judgment_reasons.is_empty():
		sections.append("%s\n%s" % [_t("hud.inspect.judgment_reasons"), _recent_reasons_text()])
	if not _agent_actions.is_empty():
		sections.append("%s\n%s" % [_t("hud.inspect.causality"), "\n".join(_agent_actions)])
	_inspect_body.text = "\n\n".join(sections)

func hide_inspection() -> void:
	_inspect_panel.visible = false
	if not is_modal():
		_hint_panel.visible = true

func show_outcome(end_result: Dictionary, closing_action := "") -> void:
	hide_conversation()
	_inspect_panel.visible = false
	_hint_panel.visible = false
	_settings_panel.visible = false
	_outcome_layer.visible = true
	var route := str(end_result.get("route", ""))
	var panel: Dictionary = end_result.get("outcomePanel", {})
	_route_tag.text = _t("hud.outcome.route", {"route": _route_name(route)})
	_outcome_title.text = str(panel.get("title", route))
	_outcome_body.text = str(panel.get("body", ""))
	_closing_action.text = closing_action
	var cited: Array = panel.get("citedLedgerIds", [])
	_cited_label.text = _t("hud.outcome.cited_none") if cited.is_empty() else _t("hud.outcome.cited", {"ids": ", ".join(cited)})
	_restart_button.call_deferred("grab_focus")

func prepare_restart() -> void:
	_status_revision += 1
	_outcome_layer.visible = false
	_inspect_panel.visible = false
	_latest_ledger_events.clear()
	_judgment_reasons.clear()
	_agent_actions.clear()
	_ledger_label.text = _t("hud.ledger.open_hint")
	set_pressure(0, 0)
	_hint_panel.visible = true

func is_modal() -> bool:
	return _conversation_panel.visible or _outcome_layer.visible or _inspect_panel.visible or _settings_panel.visible

func conversation_visible() -> bool:
	return _conversation_panel.visible

func outcome_visible() -> bool:
	return _outcome_layer.visible

func _submit_choice(index: int) -> void:
	if _busy or index < 0 or index >= _choice_buttons.size():
		return
	var button := _choice_buttons[index]
	if not button.visible or button.disabled:
		return
	set_busy(true)
	choice_submitted.emit(str(button.get_meta("choice_id", "")))

func _submit_text(raw_text: String) -> void:
	if _busy:
		return
	var text := raw_text.strip_edges()
	if text.is_empty():
		_input.grab_focus()
		return
	_show_recorded_stamp()
	set_busy(true)
	free_input_submitted.emit(text)

func _on_hesitation_timeout() -> void:
	if _busy or not _conversation_panel.visible:
		return
	set_busy(true)
	_timer_label.text = _t("hud.conversation.hesitation")
	hesitation_submitted.emit()

func _show_recorded_stamp() -> void:
	_stamp.visible = true
	_stamp.modulate.a = 0.0
	_stamp.scale = Vector2(1.35, 1.35)
	_stamp.pivot_offset = _stamp.size * 0.5
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(_stamp, "modulate:a", 1.0, 0.10)
	tween.parallel().tween_property(_stamp, "scale", Vector2.ONE, 0.16)
	tween.tween_interval(0.52)
	tween.tween_property(_stamp, "modulate:a", 0.0, 0.22)

func _request_restart() -> void:
	if not _outcome_layer.visible:
		return
	_restart_button.disabled = true
	restart_requested.emit()

func _actor_name(actor_id: String) -> String:
	var key := "npc.%s.label" % actor_id
	var resolved := _t(key)
	return resolved if resolved != key else actor_id

func _role_name(role: String) -> String:
	var key := "role.%s" % role
	var resolved := _t(key)
	return resolved if resolved != key else role

func _route_name(route: String) -> String:
	var key := "route.%s" % route
	var resolved := _t(key)
	return resolved if resolved != key else route

func _recent_reasons_text() -> String:
	if _judgment_reasons.is_empty():
		return "—"
	var lines: Array[String] = []
	for reason in _judgment_reasons:
		lines.append("• %s" % reason)
	return "\n".join(lines)

func _show_transient_status(text: String, color: Color) -> void:
	_status_revision += 1
	var revision := _status_revision
	_ledger_label.text = text
	_ledger_label.modulate = color
	var tween := create_tween()
	tween.tween_interval(2.2)
	tween.tween_callback(func() -> void:
		if revision != _status_revision:
			return
		_ledger_label.text = _t("hud.ledger.open_hint")
		_ledger_label.modulate = MUTED
	)

func _t(key: String, args: Dictionary = {}) -> String:
	var loc := get_node_or_null("/root/Localization")
	if loc != null:
		return str(loc.call("t", key, args))
	return key.format(args)

func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}

func _label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	_set_scaled_font(label, size)
	label.add_theme_color_override("font_color", color)
	return label

func _metric_label(label_text: String) -> Label:
	var label := _label("%s 000" % label_text, 12, INK)
	_set_scaled_minimum(label, Vector2(50, 0))
	return label

func _meter(fill_color: Color) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.min_value = 0
	bar.max_value = 120
	bar.show_percentage = false
	_set_scaled_minimum(bar, Vector2(84, 5))
	var background := StyleBoxFlat.new()
	background.bg_color = Color(0.02, 0.025, 0.035, 0.82)
	background.corner_radius_top_left = 1
	background.corner_radius_top_right = 1
	background.corner_radius_bottom_left = 1
	background.corner_radius_bottom_right = 1
	var fill := StyleBoxFlat.new()
	fill.bg_color = fill_color
	fill.corner_radius_top_left = 1
	fill.corner_radius_top_right = 1
	fill.corner_radius_bottom_left = 1
	fill.corner_radius_bottom_right = 1
	bar.add_theme_stylebox_override("background", background)
	bar.add_theme_stylebox_override("fill", fill)
	return bar

func _panel_style(bg: Color, accent: Color, alpha: float, radius: int, shadow: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = Color(accent, alpha)
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.shadow_color = Color(0, 0, 0, 0.42)
	style.shadow_size = shadow
	style.shadow_offset = Vector2(0, 2)
	return style

func _input_style(focused: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#151a22")
	style.border_color = Color(COLD, 0.85 if focused else 0.34)
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	style.content_margin_left = 7
	style.content_margin_right = 7
	return style

func _apply_button_styles(button: Button, bg: Color, accent: Color) -> void:
	button.add_theme_color_override("font_color", INK)
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_color_override("font_focus_color", Color.WHITE)
	button.add_theme_stylebox_override("normal", _button_style(bg, accent, 0.20, 2))
	button.add_theme_stylebox_override("hover", _button_style(bg.lightened(0.08), accent, 0.62, 2))
	button.add_theme_stylebox_override("focus", _button_style(bg.lightened(0.06), accent, 0.88, 2))
	button.add_theme_stylebox_override("pressed", _button_style(bg.darkened(0.08), accent, 0.92, 2))
	button.add_theme_stylebox_override("disabled", _button_style(bg.darkened(0.12), accent, 0.10, 2))

func _button_style(bg: Color, accent: Color, alpha: float, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = Color(accent, alpha)
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.content_margin_left = 8
	style.content_margin_right = 8
	return style

func _margin(left: int, top: int, right: int, bottom: int) -> MarginContainer:
	var margin := MarginContainer.new()
	margin.set_meta("hud_base_margins", Vector4(left, top, right, bottom))
	_apply_margin_scale(margin)
	return margin

## Base typography: logical px at 720p ≈ physical px. Body text lands at
## ~22px on 1080p and ~45px on 4K at 100% after the M3 readability bump.
## The user scale multiplies on top (Esc settings, 80–150%).
func _calculate_ui_scale() -> float:
	var height := get_viewport().get_visible_rect().size.y
	return clampf(height / HUD_REFERENCE_HEIGHT, 1.0, 3.0) * _user_scale

func _set_scaled_font(control: Control, logical_size: int) -> void:
	control.set_meta("hud_base_font_size", logical_size)
	control.add_theme_font_size_override("font_size", roundi(logical_size * _ui_scale))

func _set_scaled_minimum(control: Control, logical_size: Vector2) -> void:
	control.set_meta("hud_base_minimum_size", logical_size)
	control.custom_minimum_size = logical_size * _ui_scale

func _apply_ui_scale() -> void:
	_ui_scale = _calculate_ui_scale()
	_apply_control_scale(_root)
	_world_text_overlays.call("set_ui_scale", _ui_scale)

func _apply_control_scale(node: Node) -> void:
	if node is Control:
		var control := node as Control
		if control.has_meta("hud_base_font_size"):
			control.add_theme_font_size_override(
				"font_size",
				roundi(float(control.get_meta("hud_base_font_size")) * _ui_scale)
			)
		if control.has_meta("hud_base_minimum_size"):
			control.custom_minimum_size = Vector2(control.get_meta("hud_base_minimum_size")) * _ui_scale
		if control is MarginContainer and control.has_meta("hud_base_margins"):
			_apply_margin_scale(control as MarginContainer)
	for child in node.get_children():
		_apply_control_scale(child)

func _apply_margin_scale(margin: MarginContainer) -> void:
	var base := Vector4(margin.get_meta("hud_base_margins", Vector4.ZERO))
	margin.add_theme_constant_override("margin_left", roundi(base.x * _ui_scale))
	margin.add_theme_constant_override("margin_top", roundi(base.y * _ui_scale))
	margin.add_theme_constant_override("margin_right", roundi(base.z * _ui_scale))
	margin.add_theme_constant_override("margin_bottom", roundi(base.w * _ui_scale))

func _set_rect(control: Control, left: float, top: float, right: float, bottom: float) -> void:
	control.anchor_left = left
	control.anchor_top = top
	control.anchor_right = right
	control.anchor_bottom = bottom
	control.offset_left = 0
	control.offset_top = 0
	control.offset_right = 0
	control.offset_bottom = 0
