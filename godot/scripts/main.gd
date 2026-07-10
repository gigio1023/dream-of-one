extends Node
## Main playable chain for M1: approach -> answer -> visible social consequence
## -> route outcome -> instant replay. Session owns truth; this controller only
## forwards input and renders the returned world, ledger, and reaction state.

const STORE_SCENE := preload("res://scenes/world/store.tscn")
const STATION_SCENE := preload("res://scenes/world/station.tscn")
const MINIMUM_WINDOW_SIZE := Vector2i(1280, 720)
const DISPLAY_CONFIG_PATH := "user://display.cfg"
const OUTPUT_PRESETS := [
	{"id": "720p", "label": "1280×720", "size": Vector2i(1280, 720)},
	{"id": "1080p", "label": "1920×1080", "size": Vector2i(1920, 1080)},
	{"id": "1440p", "label": "2560×1440", "size": Vector2i(2560, 1440)},
	{"id": "4k", "label": "3840×2160", "size": Vector2i(3840, 2160)},
]
## Output size and world magnification are separate domains: a taller window
## gets a wider logical view at a gentler integer scale, instead of the same
## view re-magnified. Entries: window height floor -> logical world view.
## 720p 320×180·4×, 1080p 480×270·4×, 1440p 512×288·5×, 4K 480×270·8×.
const WORLD_VIEW_LADDER := [
	{"minHeight": 1900, "view": Vector2i(480, 270)},
	{"minHeight": 1300, "view": Vector2i(512, 288)},
	{"minHeight": 900, "view": Vector2i(480, 270)},
	{"minHeight": 0, "view": Vector2i(320, 180)},
]
## User-selectable HUD scale (Esc settings), multiplied on top of the
## height-proportional base. 1.0 is regular PC density.
const UI_SCALE_VALUES := [0.8, 1.0, 1.25, 1.5]

@onready var _world_container: SubViewportContainer = $WorldFrame/WorldContainer
@onready var _world_viewport: SubViewport = $WorldFrame/WorldContainer/WorldViewport
@onready var _world_root: Node2D = $WorldFrame/WorldContainer/WorldViewport/World
@onready var _hud: CanvasLayer = $HUD

var _location: Node2D = null
var _location_id := "store"
var _player: Node = null
var _current_turn: Dictionary = {}
var _latest_exchange := ""
var _last_ledger_event: Dictionary = {}
var _transitioning := false
var _transition_target := ""
var _resolving_answer := false
var _ambient_beat := 0
var _output_preset := "1080p"
var _user_ui_scale := 1.0
var _debug_visible := false

func _ready() -> void:
	DisplayServer.window_set_min_size(MINIMUM_WINDOW_SIZE)
	_output_preset = _load_output_preset()
	_apply_output_preset(_output_preset, false)
	get_viewport().size_changed.connect(_layout_world_viewport)
	_layout_world_viewport()
	_connect_session()
	_hud.choice_submitted.connect(_on_choice_submitted)
	_hud.free_input_submitted.connect(_on_free_input_submitted)
	_hud.hesitation_submitted.connect(_on_hesitation_submitted)
	_hud.restart_requested.connect(_on_restart_requested)
	_hud.conversation_closed.connect(_refresh_player_input)
	_hud.resolution_requested.connect(_on_resolution_requested)
	_hud.configure_resolution_options(OUTPUT_PRESETS, _output_preset)
	_hud.ui_scale_requested.connect(_on_ui_scale_requested)
	_user_ui_scale = _load_ui_scale()
	_hud.set_user_scale(_user_ui_scale)
	_hud.configure_ui_scale_options(_ui_scale_options(), _user_ui_scale)
	call_deferred("_begin_session")

func _layout_world_viewport() -> void:
	var available := Vector2(get_viewport().get_visible_rect().size)
	if available.x <= 0.0 or available.y <= 0.0:
		return
	var view := _world_view_for_height(available.y)
	var integer_scale := maxi(1, floori(minf(available.x / view.x, available.y / view.y)))
	_world_viewport.size = view
	_world_container.size = Vector2(view)
	_world_container.scale = Vector2(integer_scale, integer_scale)
	_world_container.position = (available - Vector2(view * integer_scale)) * 0.5

func _world_view_for_height(height: float) -> Vector2i:
	for step in WORLD_VIEW_LADDER:
		if height >= float(step.get("minHeight", 0)):
			return step.get("view", Vector2i(320, 180))
	return Vector2i(320, 180)

func _on_resolution_requested(preset_id: String) -> void:
	_apply_output_preset(preset_id, true)

func _apply_output_preset(preset_id: String, persist: bool) -> void:
	var spec := _output_preset_spec(preset_id)
	if spec.is_empty():
		return
	_output_preset = preset_id
	if DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_WINDOWED:
		DisplayServer.window_set_size(spec.get("size", Vector2i(1920, 1080)))
		_center_window_on_screen()
	if persist:
		_save_output_preset()
	_layout_world_viewport.call_deferred()

func _output_preset_spec(preset_id: String) -> Dictionary:
	for spec in OUTPUT_PRESETS:
		if str(spec.get("id", "")) == preset_id:
			return spec
	return {}

func _center_window_on_screen() -> void:
	var window_size := DisplayServer.window_get_size()
	var screen := DisplayServer.window_get_current_screen()
	var usable_rect := DisplayServer.screen_get_usable_rect(screen)
	var position := usable_rect.position + (usable_rect.size - window_size) / 2
	DisplayServer.window_set_position(position)

func _load_output_preset() -> String:
	var environment_preset := OS.get_environment("DREAM_OUTPUT_PRESET").strip_edges().to_lower()
	if not environment_preset.is_empty() and not _output_preset_spec(environment_preset).is_empty():
		return environment_preset
	var config := ConfigFile.new()
	if config.load(DISPLAY_CONFIG_PATH) != OK:
		return "1080p"
	var preset_id := str(config.get_value("display", "output_preset", "1080p"))
	return preset_id if not _output_preset_spec(preset_id).is_empty() else "1080p"

func _save_output_preset() -> void:
	_save_display_config()

func _save_display_config() -> void:
	var config := ConfigFile.new()
	config.load(DISPLAY_CONFIG_PATH)
	config.set_value("display", "output_preset", _output_preset)
	config.set_value("display", "ui_scale", _user_ui_scale)
	var error := config.save(DISPLAY_CONFIG_PATH)
	if error != OK:
		push_warning("Could not save display config: %s" % error_string(error))

func _load_ui_scale() -> float:
	var config := ConfigFile.new()
	if config.load(DISPLAY_CONFIG_PATH) != OK:
		return 1.0
	return clampf(float(config.get_value("display", "ui_scale", 1.0)), 0.5, 2.0)

func _ui_scale_options() -> Array:
	var options: Array = []
	for value_variant in UI_SCALE_VALUES:
		var value := float(value_variant)
		options.append({
			"value": value,
			"label": _t("hud.scale.%d" % roundi(value * 100)),
		})
	return options

func _on_ui_scale_requested(value: float) -> void:
	_user_ui_scale = clampf(value, 0.5, 2.0)
	_hud.set_user_scale(_user_ui_scale)
	_save_display_config()

func _process(_delta: float) -> void:
	_sync_actor_overlays()
	if not is_instance_valid(_player):
		return
	_player.input_enabled = not _hud.is_modal() and not _transitioning and not _resolving_answer
	var area: Area2D = _player.focused_interactable() if _player.input_enabled else null
	_player.set_focused_area(area)
	if area == null:
		_hud.set_hint(_t("hud.prompt.approach"))
		return
	var parent := area.get_parent()
	var title := ""
	if parent != null and parent.has_method("inspect_payload"):
		title = str((parent.call("inspect_payload") as Dictionary).get("title", ""))
	_hud.set_hint(_t("hud.prompt.focus", {"target": title}))

func _sync_actor_overlays() -> void:
	if not is_instance_valid(_location):
		_hud.sync_actor_overlays([])
		return
	var overlays: Array = _location.call("actor_overlay_payloads")
	var positioned: Array[Dictionary] = []
	var canvas_transform := _world_viewport.get_canvas_transform()
	var speaker_id := ""
	if _hud.conversation_visible() and not _current_turn.is_empty():
		speaker_id = str(_current_turn.get("speakerId", _current_turn.get("actorId", "")))
	for payload_value in overlays:
		if not payload_value is Dictionary:
			continue
		var payload: Dictionary = payload_value.duplicate(true)
		var world_position := Vector2(payload.get("worldPosition", Vector2.ZERO))
		var viewport_position := canvas_transform * world_position
		payload["screenPosition"] = _world_container.global_position + viewport_position * _world_container.scale
		payload["speaking"] = not speaker_id.is_empty() and str(payload.get("actorId", "")) == speaker_id
		positioned.append(payload)
	_hud.sync_actor_overlays(positioned)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_debug"):
		_debug_visible = not _debug_visible
		if is_instance_valid(_location):
			_location.call("set_debug_visible", _debug_visible)
		_hud.set_debug_mode(_debug_visible)
		get_viewport().set_input_as_handled()
		return
	if _hud.is_modal() or _transitioning or _resolving_answer:
		return
	if event.is_action_pressed("open_ledger"):
		_hud.show_ledger()
		_refresh_player_input()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("interact"):
		_interact()
		get_viewport().set_input_as_handled()

func _connect_session() -> void:
	Session.session_started.connect(_on_session_started)
	Session.beat_opened.connect(_on_beat_opened)
	Session.answer_resolved.connect(_on_answer_resolved)
	Session.ledger_event.connect(_on_ledger_event)
	Session.npc_reaction.connect(_on_npc_reaction)
	Session.location_transition.connect(_on_session_location_transition)
	Session.route_ended.connect(_on_route_ended)
	Session.request_failed.connect(_on_session_request_failed)

func _begin_session() -> void:
	_hud.set_mode(Session.mode())
	var response: Dictionary = await Session.start_session("same-order", "ko-KR")
	if response.is_empty():
		_hud.set_hint(_t("hud.error.session_start"))
		return
	var snapshot: Dictionary = response.get("worldSnapshot", {})
	await _load_location("store", snapshot)
	_hud.set_hint(_t("hud.prompt.approach"))

func _interact() -> void:
	if not is_instance_valid(_player):
		return
	var area: Area2D = _player.focused_interactable()
	if area == null:
		return
	var target := area.get_parent()
	if target == null or not target.has_method("inspect_payload"):
		return
	var payload: Dictionary = target.call("inspect_payload")
	if str(payload.get("kind", "")) == "npc":
		var actor_id := str(payload.get("id", ""))
		var turn: Dictionary = Session.current_beat_view()
		var speaker_id := str(turn.get("speakerId", turn.get("actorId", "")))
		if not turn.is_empty() and actor_id == speaker_id:
			Session.open_current_beat()
		else:
			_hud.show_inspection(payload, _latest_exchange)
	else:
		_hud.show_inspection(payload, _latest_exchange)
	_refresh_player_input()

func _on_session_started(snapshot: Dictionary) -> void:
	var hud_state: Dictionary = snapshot.get("hudState", {})
	_hud.set_pressure(int(hud_state.get("suspicion", 0)), int(hud_state.get("reportPressure", 0)))

func _on_beat_opened(turn: Dictionary) -> void:
	_current_turn = turn.duplicate(true)
	var beat_id := str(turn.get("beatId", ""))
	if beat_id == "reconciliation":
		while _transitioning:
			await get_tree().process_frame
		if _location_id != "station":
			await _load_location("station")
	_hud.show_turn(turn)
	_refresh_player_input()

func _on_choice_submitted(choice_id: String) -> void:
	await _submit_answer({"type": "choice", "choiceId": choice_id})

func _on_free_input_submitted(text: String) -> void:
	await _submit_answer({"type": "free_input", "text": text})

func _on_hesitation_submitted() -> void:
	await _submit_answer({"type": "hesitation"})

func _submit_answer(payload: Dictionary) -> void:
	if _resolving_answer:
		return
	_resolving_answer = true
	_refresh_player_input()
	var result: Dictionary = await Session.answer(payload)
	_resolving_answer = false
	if result.is_empty() or result.has("error"):
		_hud.show_conversation_error(_t("hud.error.answer"))
		push_warning("Session answer failed: %s" % JSON.stringify(result))
	_refresh_player_input()

func _on_session_request_failed(operation: String, error: Dictionary) -> void:
	if operation == "answer" and _hud.conversation_visible():
		_hud.show_conversation_error(_t("hud.error.answer"))
	push_warning("Session %s failed: %s" % [operation, JSON.stringify(error)])

func _on_answer_resolved(result: Dictionary) -> void:
	var route_state: Dictionary = result.get("routeState", {})
	_hud.set_pressure(
		int(route_state.get("suspicion", 0)),
		int(route_state.get("reportPressure", result.get("reportPressure", 0))),
		result.get("whyLines", [])
	)
	if not bool(route_state.get("terminal", false)):
		_hud.set_busy(false)
	var transcript_value: Variant = result.get("transcriptDeltas", [])
	if transcript_value is Array:
		for entry_value in transcript_value as Array:
			if entry_value is Dictionary:
				_hud.show_agent_step(entry_value as Dictionary)
	if not bool(route_state.get("terminal", false)):
		_ambient_beat += 1
		_run_ambient_beat(_ambient_beat)

## The town keeps existing while the player talks: after each resolved answer
## the ambient NPCs (manager, waiting customer) get one bounded agent-loop
## beat, and their validated actions are rendered like any other reaction.
func _run_ambient_beat(beat: int) -> void:
	var result: Dictionary = await Session.npc_decision(beat)
	if result.is_empty() or result.has("error"):
		return
	for action_value in result.get("npcActions", []):
		if not action_value is Dictionary:
			continue
		var action: Dictionary = action_value
		var validation: Dictionary = action.get("validationResult", {}) if action.get("validationResult") is Dictionary else {}
		if not bool(validation.get("ok", false)):
			continue
		_show_ambient_action(action)
	var transcript_value: Variant = result.get("transcriptDeltas", [])
	if transcript_value is Array:
		for entry_value in transcript_value as Array:
			if entry_value is Dictionary:
				_hud.show_agent_step(entry_value as Dictionary)

func _show_ambient_action(action: Dictionary) -> void:
	if not is_instance_valid(_location):
		return
	var actor_id := str(action.get("actorId", ""))
	var npc: Node = _location.call("get_npc", actor_id)
	if npc == null:
		return
	var utterance := str(action.get("utterance", ""))
	if not utterance.is_empty():
		npc.show_speech(utterance)
	var marker_state := _reaction_state(action)
	npc.set_reaction(marker_state, _t("reaction.%s" % marker_state))
	npc.set_social_action(str(action.get("tool", "observe")), _proposal_source(action))

func _on_ledger_event(event: Dictionary) -> void:
	_last_ledger_event = event.duplicate(true)
	_hud.set_latest_ledger(event)
	var object_id := str(event.get("objectId", ""))
	var to_state := str(event.get("toState", event.get("state", "")))
	if is_instance_valid(_location) and not object_id.is_empty():
		var prop: Node = _location.call("get_prop", object_id)
		if prop != null and not to_state.is_empty():
			prop.set_state(to_state)
	var actor_id := str(event.get("actorId", ""))
	if is_instance_valid(_location) and not actor_id.is_empty():
		var actor: Node = _location.call("get_npc", actor_id)
		if actor != null:
			actor.set_reaction("noted", _t("reaction.noted"))
			actor.set_social_action(_ledger_action(event), str(event.get("eventId", event.get("id", ""))))

func _on_npc_reaction(reaction: Dictionary) -> void:
	var actor_id := str(reaction.get("actorId", ""))
	var utterance := str(reaction.get("utterance", ""))
	if not utterance.is_empty():
		_latest_exchange = utterance
	if not is_instance_valid(_location):
		return
	var npc: Node = _location.call("get_npc", actor_id)
	if npc != null:
		if not utterance.is_empty():
			npc.show_speech(utterance)
		var marker_state := _reaction_state(reaction)
		npc.set_reaction(marker_state, _t("reaction.%s" % marker_state))
		npc.set_social_action(str(reaction.get("tool", "talk_to")), _proposal_source(reaction))
	var influence: Dictionary = reaction.get("influence", {})
	var from_id := str(influence.get("from", reaction.get("influenceFrom", "")))
	var to_id := str(influence.get("to", actor_id))
	if not from_id.is_empty() and not to_id.is_empty():
		_draw_influence(from_id, to_id)

func _reaction_state(reaction: Dictionary) -> String:
	if reaction.has("reaction"):
		return str(reaction.get("reaction", "noted"))
	if str(reaction.get("kind", "")) == "speech":
		return "probing"
	var tool := str(reaction.get("tool", ""))
	if tool == "write_record" or tool == "use_object":
		return "reported"
	if tool == "talk_to":
		return "forwarded"
	return "noted"

func _proposal_source(action: Dictionary) -> String:
	var meta: Dictionary = action.get("proposalMeta", {}) if action.get("proposalMeta") is Dictionary else {}
	return str(meta.get("profileId", action.get("source", "agent_loop")))

func _ledger_action(event: Dictionary) -> String:
	var kind := str(event.get("kind", ""))
	if kind.contains("cited") or kind.contains("read"):
		return "use_object"
	return "write_record"

func _draw_influence(from_id: String, to_id: String) -> void:
	if not is_instance_valid(_location):
		return
	var from_actor: Node2D = _location.call("get_npc", from_id)
	var to_actor: Node2D = _location.call("get_npc", to_id)
	if from_actor == null or to_actor == null:
		return
	var line := Line2D.new()
	line.name = "Influence_%s_%s" % [from_id, to_id]
	line.width = 1.5
	line.default_color = Color(0.56, 0.72, 0.92, 0.92)
	line.points = PackedVector2Array([from_actor.position - Vector2(0, 10), to_actor.position - Vector2(0, 10)])
	var influence_root: Node2D = _location.call("influence_layer")
	influence_root.add_child(line)
	var tween := line.create_tween()
	tween.tween_interval(0.65)
	tween.tween_property(line, "modulate:a", 0.0, 0.35)
	tween.tween_callback(line.queue_free)

func _on_session_location_transition(location_id: String) -> void:
	await _load_location(location_id)

func _on_route_ended(end_result: Dictionary) -> void:
	var closing := ""
	if not _last_ledger_event.is_empty():
		closing = _t("hud.outcome.closing", {
			"actor": _actor_name(str(_last_ledger_event.get("actorId", ""))),
			"action": str(_last_ledger_event.get("whyLine", _last_ledger_event.get("kind", ""))),
		})
	_hud.show_outcome(end_result, closing)
	_refresh_player_input()

func _on_restart_requested() -> void:
	if _transitioning:
		return
	_transitioning = true
	_hud.prepare_restart()
	_latest_exchange = ""
	_last_ledger_event.clear()
	_current_turn.clear()
	_ambient_beat = 0
	var response: Dictionary = await Session.restart("same-order", "ko-KR")
	var snapshot: Dictionary = response.get("worldSnapshot", {})
	_transitioning = false
	await _load_location("store", snapshot)
	_hud.set_hint(_t("hud.prompt.approach"))

func _on_doorway_entered(target_location: String) -> void:
	if _transitioning or _hud.is_modal():
		return
	await _load_location(target_location)

func _load_location(location_id: String, snapshot: Dictionary = {}) -> void:
	if _transitioning:
		if location_id == _transition_target:
			while _transitioning:
				await get_tree().process_frame
			return
		while _transitioning:
			await get_tree().process_frame
		if location_id == _location_id and is_instance_valid(_location):
			return
	_transitioning = true
	_transition_target = location_id
	if snapshot.is_empty() and Session.is_started():
		var full_snapshot: Dictionary = await Session.snapshot()
		snapshot = full_snapshot.get("worldSnapshot", full_snapshot)
	if is_instance_valid(_location):
		_location.queue_free()
		_location = null
	var scene: PackedScene = STATION_SCENE if location_id == "station" else STORE_SCENE
	var next_location := scene.instantiate()
	next_location.configure_snapshot(snapshot)
	_world_root.add_child(next_location)
	_location = next_location
	_location_id = location_id
	_location.doorway_entered.connect(_on_doorway_entered)
	await get_tree().process_frame
	_player = _location.get_player()
	_location.call("set_debug_visible", _debug_visible)
	_hud.set_location(location_id)
	_transitioning = false
	_transition_target = ""
	_refresh_player_input()

func _refresh_player_input() -> void:
	if is_instance_valid(_player):
		_player.input_enabled = not _hud.is_modal() and not _transitioning and not _resolving_answer

func _actor_name(actor_id: String) -> String:
	if is_instance_valid(_location):
		var npc: Node = _location.call("get_npc", actor_id)
		if npc != null:
			return str(npc.get("label_text"))
	var key := "npc.%s.label" % actor_id
	var resolved := _t(key)
	return resolved if resolved != key else actor_id

func _t(key: String, args: Dictionary = {}) -> String:
	return str(Localization.t(key, args))
