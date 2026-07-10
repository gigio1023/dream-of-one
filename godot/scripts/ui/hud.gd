extends CanvasLayer
## M1 HUD: a restrained, diegetic record surface over the warm pixel world.
## The world remains visible while answering; cold authority color enters only
## through pressure, records, and the Station outcome.

signal choice_submitted(choice_id: String)
signal free_input_submitted(text: String)
signal hesitation_submitted
signal conversation_closed
signal restart_requested

const HESITATION_SECONDS := 6.0
const INPUT_MAX_LENGTH := 120

const INK := Color("#ece8dc")
const MUTED := Color("#a9b0b8")
const WARM := Color("#e2a33d")
const COLD := Color("#6f8fbd")
const DANGER := Color("#c8645a")
const PAPER := Color(0.075, 0.083, 0.098, 0.96)
const PAPER_SOFT := Color(0.105, 0.112, 0.126, 0.94)

var _root: Control
var _pressure_panel: PanelContainer
var _location_label: Label
var _mode_label: Label
var _suspicion_label: Label
var _suspicion_bar: ProgressBar
var _report_label: Label
var _report_bar: ProgressBar
var _ledger_label: Label

var _conversation_panel: PanelContainer
var _speaker_label: Label
var _prompt_label: Label
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

var _hint_panel: PanelContainer
var _hint_label: Label

var _outcome_layer: Control
var _route_tag: Label
var _outcome_title: Label
var _outcome_body: Label
var _closing_action: Label
var _cited_label: Label
var _restart_button: Button

var _busy := false
var _latest_ledger_events: Array = []

func _ready() -> void:
	layer = 20
	_build_ui()
	set_process(true)

func _process(_delta: float) -> void:
	if not _conversation_panel.visible or _hesitation_timer.is_stopped():
		return
	var remaining := maxf(_hesitation_timer.time_left, 0.0)
	_timer_bar.value = HESITATION_SECONDS - remaining
	_timer_label.text = _t("hud.timer.seconds", {"seconds": "%0.1f" % remaining})

func _unhandled_input(event: InputEvent) -> void:
	if _outcome_layer.visible:
		if event.is_action_pressed("ui_accept"):
			_request_restart()
			get_viewport().set_input_as_handled()
		return
	if _inspect_panel.visible and (event.is_action_pressed("cancel") or event.is_action_pressed("interact")):
		hide_inspection()
		get_viewport().set_input_as_handled()
		return
	if not _conversation_panel.visible:
		return
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

func _build_ui() -> void:
	_root = Control.new()
	_root.name = "Root"
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_root)
	_build_pressure_panel()
	_build_hint_panel()
	_build_conversation_panel()
	_build_inspect_panel()
	_build_outcome_panel()

func _build_pressure_panel() -> void:
	_pressure_panel = PanelContainer.new()
	_pressure_panel.name = "PressureLine"
	_set_rect(_pressure_panel, 0.025, 0.02, 0.975, 0.18)
	_pressure_panel.add_theme_stylebox_override("panel", _panel_style(PAPER, COLD, 0.30, 4, 4))
	_root.add_child(_pressure_panel)
	var margin := _margin(8, 6, 8, 5)
	_pressure_panel.add_child(margin)
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 3)
	margin.add_child(rows)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 6)
	rows.add_child(header)
	_location_label = _label(_t("world.location.store"), 11, INK)
	header.add_child(_location_label)
	var divider := _label("/", 10, Color(INK, 0.35))
	header.add_child(divider)
	var title := _label(_t("hud.subtitle"), 9, MUTED)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	_mode_label = _label(_t("hud.mode.fixture"), 8, COLD)
	_mode_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	header.add_child(_mode_label)

	var meters := HBoxContainer.new()
	meters.add_theme_constant_override("separation", 6)
	rows.add_child(meters)
	_suspicion_label = _metric_label(_t("hud.pressure.suspicion"))
	meters.add_child(_suspicion_label)
	_suspicion_bar = _meter(WARM)
	_suspicion_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	meters.add_child(_suspicion_bar)
	_report_label = _metric_label(_t("hud.pressure.report"))
	meters.add_child(_report_label)
	_report_bar = _meter(COLD)
	_report_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	meters.add_child(_report_bar)

	_ledger_label = _label(_t("hud.ledger.empty"), 8, MUTED)
	_ledger_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	rows.add_child(_ledger_label)

func _build_hint_panel() -> void:
	_hint_panel = PanelContainer.new()
	_hint_panel.name = "ApproachHint"
	_set_rect(_hint_panel, 0.10, 0.865, 0.90, 0.965)
	_hint_panel.add_theme_stylebox_override("panel", _panel_style(PAPER, WARM, 0.24, 3, 3))
	_root.add_child(_hint_panel)
	var margin := _margin(8, 4, 8, 4)
	_hint_panel.add_child(margin)
	_hint_label = _label(_t("hud.prompt.approach"), 9, INK)
	_hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hint_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	margin.add_child(_hint_label)

func _build_conversation_panel() -> void:
	_conversation_panel = PanelContainer.new()
	_conversation_panel.name = "ConversationPanel"
	_set_rect(_conversation_panel, 0.05, 0.43, 0.95, 0.975)
	_conversation_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_conversation_panel.add_theme_stylebox_override("panel", _panel_style(PAPER, WARM, 0.42, 5, 5))
	_conversation_panel.visible = false
	_root.add_child(_conversation_panel)
	var margin := _margin(10, 7, 10, 7)
	_conversation_panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 6)
	column.add_child(header)
	_speaker_label = _label("", 11, WARM)
	_speaker_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(_speaker_label)
	_stamp = _label(_t("hud.conversation.recorded_stamp"), 10, Color("#e8b46c"))
	_stamp.visible = false
	_stamp.rotation = -0.08
	header.add_child(_stamp)
	_timer_label = _label(_t("hud.timer.seconds", {"seconds": "6.0"}), 9, MUTED)
	_timer_label.custom_minimum_size.x = 42
	_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	header.add_child(_timer_label)

	_prompt_label = _label("", 12, INK)
	_prompt_label.custom_minimum_size.y = 30
	_prompt_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_prompt_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	column.add_child(_prompt_label)

	_timer_bar = _meter(COLD)
	_timer_bar.max_value = HESITATION_SECONDS
	_timer_bar.custom_minimum_size.y = 3
	column.add_child(_timer_bar)

	for index in range(3):
		var button := Button.new()
		button.name = "Choice%d" % (index + 1)
		button.custom_minimum_size.y = 26
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.focus_mode = Control.FOCUS_ALL
		button.add_theme_font_size_override("font_size", 10)
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
	_input.add_theme_font_size_override("font_size", 9)
	_input.add_theme_color_override("font_color", INK)
	_input.add_theme_color_override("font_placeholder_color", Color(MUTED, 0.7))
	_input.add_theme_stylebox_override("normal", _input_style(false))
	_input.add_theme_stylebox_override("focus", _input_style(true))
	_input.text_submitted.connect(_submit_text)
	input_row.add_child(_input)
	_submit_button = Button.new()
	_submit_button.text = _t("hud.conversation.submit")
	_submit_button.custom_minimum_size = Vector2(52, 26)
	_submit_button.add_theme_font_size_override("font_size", 9)
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
	_set_rect(_inspect_panel, 0.55, 0.20, 0.975, 0.76)
	_inspect_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_inspect_panel.add_theme_stylebox_override("panel", _panel_style(PAPER, COLD, 0.38, 4, 4))
	_inspect_panel.visible = false
	_root.add_child(_inspect_panel)
	var margin := _margin(10, 8, 10, 8)
	_inspect_panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)
	_inspect_title = _label(_t("hud.inspect.title"), 13, COLD)
	column.add_child(_inspect_title)
	var rule := HSeparator.new()
	column.add_child(rule)
	_inspect_body = _label("", 10, INK)
	_inspect_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_inspect_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(_inspect_body)
	var close_hint := _label(_t("hud.inspect.close"), 8, MUTED)
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
	dim.color = Color(0.035, 0.045, 0.06, 0.82)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_outcome_layer.add_child(dim)
	var panel := PanelContainer.new()
	_set_rect(panel, 0.16, 0.14, 0.84, 0.88)
	panel.add_theme_stylebox_override("panel", _panel_style(Color("#111923"), COLD, 0.70, 6, 7))
	_outcome_layer.add_child(panel)
	var margin := _margin(18, 14, 18, 14)
	panel.add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	margin.add_child(column)
	_route_tag = _label(_t("hud.outcome.route", {"route": ""}), 9, COLD)
	column.add_child(_route_tag)
	_outcome_title = _label("", 21, INK)
	_outcome_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_outcome_title)
	_outcome_body = _label("", 11, INK)
	_outcome_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_outcome_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(_outcome_body)
	_closing_action = _label("", 9, Color("#b8c9df"))
	_closing_action.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_closing_action)
	_cited_label = _label("", 8, MUTED)
	_cited_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_cited_label)
	_restart_button = Button.new()
	_restart_button.text = _t("hud.outcome.restart")
	_restart_button.custom_minimum_size.y = 34
	_restart_button.add_theme_font_size_override("font_size", 11)
	_apply_button_styles(_restart_button, Color("#27364a"), COLD)
	_restart_button.pressed.connect(_request_restart)
	column.add_child(_restart_button)

func show_turn(turn: Dictionary) -> void:
	_busy = false
	_inspect_panel.visible = false
	_hint_panel.visible = false
	_outcome_layer.visible = false
	_conversation_panel.visible = true
	var actor_id := str(turn.get("speakerId", turn.get("actorId", "")))
	_speaker_label.text = _actor_name(actor_id)
	_prompt_label.text = str(turn.get("prompt", ""))
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

func show_conversation_error(message: String) -> void:
	set_busy(false)
	_ledger_label.text = message
	_ledger_label.modulate = DANGER
	if _conversation_panel.visible:
		_hesitation_timer.start(HESITATION_SECONDS)

func set_pressure(suspicion: int, report_pressure: int, why_lines: Array = []) -> void:
	_suspicion_bar.value = suspicion
	_report_bar.value = report_pressure
	_suspicion_label.text = "%s %03d" % [_t("hud.pressure.suspicion"), suspicion]
	_report_label.text = "%s %03d" % [_t("hud.pressure.report"), report_pressure]
	if not why_lines.is_empty():
		_ledger_label.text = _t("hud.pressure.why", {"line": " / ".join(why_lines)})
	var authority: int = maxi(suspicion, report_pressure)
	_pressure_panel.add_theme_stylebox_override(
		"panel",
		_panel_style(PAPER, DANGER if authority >= 90 else COLD, 0.65 if authority >= 90 else 0.30, 4, 4)
	)

func set_latest_ledger(event: Dictionary) -> void:
	_latest_ledger_events.append(event.duplicate(true))
	if _latest_ledger_events.size() > 8:
		_latest_ledger_events.pop_front()
	var event_id := str(event.get("eventId", event.get("id", "")))
	var line := str(event.get("whyLine", event.get("summary", event.get("kind", ""))))
	_ledger_label.text = "%s · %s" % [event_id, line]
	_ledger_label.modulate = Color("#f4cc7d")
	var tween := create_tween()
	tween.tween_property(_ledger_label, "modulate", MUTED, 0.65)

func set_location(location_id: String) -> void:
	_location_label.text = _t("world.location.%s" % location_id)

func set_mode(mode: String) -> void:
	_mode_label.text = _t("hud.mode.http" if mode == "http" else "hud.mode.fixture")
	_mode_label.modulate = COLD if mode == "http" else Color("#91b7a0")

func set_hint(text: String) -> void:
	_hint_label.text = text
	if not is_modal():
		_hint_panel.visible = true

func show_inspection(payload: Dictionary, latest_exchange := "") -> void:
	_inspect_panel.visible = true
	_hint_panel.visible = false
	var title := str(payload.get("title", ""))
	_inspect_title.text = "%s · %s" % [_t("hud.inspect.title"), title]
	if str(payload.get("kind", "")) == "npc":
		var reaction := str(payload.get("reaction", ""))
		var utterance := str(payload.get("utterance", latest_exchange))
		_inspect_body.text = "%s\n%s\n\n%s\n%s" % [
			str(payload.get("role", "")),
			reaction,
			_t("hud.pressure.exchange", {"line": utterance if not utterance.is_empty() else "—"}),
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
	_inspect_title.text = _t("hud.ledger.title")
	if _latest_ledger_events.is_empty():
		_inspect_body.text = _t("hud.ledger.empty")
		return
	var lines: Array[String] = []
	for event in _latest_ledger_events:
		var event_id := str(event.get("eventId", event.get("id", "")))
		var line := str(event.get("whyLine", event.get("summary", event.get("kind", ""))))
		lines.append("%s  %s" % [event_id, line])
	_inspect_body.text = "\n\n".join(lines)

func hide_inspection() -> void:
	_inspect_panel.visible = false
	if not is_modal():
		_hint_panel.visible = true

func show_outcome(end_result: Dictionary, closing_action := "") -> void:
	hide_conversation()
	_inspect_panel.visible = false
	_hint_panel.visible = false
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
	_outcome_layer.visible = false
	_inspect_panel.visible = false
	_latest_ledger_events.clear()
	_ledger_label.text = _t("hud.ledger.empty")
	set_pressure(0, 0)
	_hint_panel.visible = true

func is_modal() -> bool:
	return _conversation_panel.visible or _outcome_layer.visible or _inspect_panel.visible

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

func _t(key: String, args: Dictionary = {}) -> String:
	var loc := get_node_or_null("/root/Localization")
	if loc != null:
		return str(loc.call("t", key, args))
	return key.format(args)

func _label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label

func _metric_label(label_text: String) -> Label:
	var label := _label("%s 000" % label_text, 8, INK)
	label.custom_minimum_size.x = 58
	return label

func _meter(fill_color: Color) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.min_value = 0
	bar.max_value = 120
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(70, 6)
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
	margin.add_theme_constant_override("margin_left", left)
	margin.add_theme_constant_override("margin_top", top)
	margin.add_theme_constant_override("margin_right", right)
	margin.add_theme_constant_override("margin_bottom", bottom)
	return margin

func _set_rect(control: Control, left: float, top: float, right: float, bottom: float) -> void:
	control.anchor_left = left
	control.anchor_top = top
	control.anchor_right = right
	control.anchor_bottom = bottom
	control.offset_left = 0
	control.offset_top = 0
	control.offset_right = 0
	control.offset_bottom = 0
