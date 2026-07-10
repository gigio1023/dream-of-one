extends Node2D
## Main playable chain for M1: approach -> answer -> visible social consequence
## -> route outcome -> instant replay. Session owns truth; this controller only
## forwards input and renders the returned world, ledger, and reaction state.

const STORE_SCENE := preload("res://scenes/world/store.tscn")
const STATION_SCENE := preload("res://scenes/world/station.tscn")

@onready var _world_root: Node2D = $World
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

func _ready() -> void:
	_connect_session()
	_hud.choice_submitted.connect(_on_choice_submitted)
	_hud.free_input_submitted.connect(_on_free_input_submitted)
	_hud.hesitation_submitted.connect(_on_hesitation_submitted)
	_hud.restart_requested.connect(_on_restart_requested)
	_hud.conversation_closed.connect(_refresh_player_input)
	call_deferred("_begin_session")

func _process(_delta: float) -> void:
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

func _unhandled_input(event: InputEvent) -> void:
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
