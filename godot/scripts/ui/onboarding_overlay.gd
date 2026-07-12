class_name OnboardingOverlay
extends CanvasLayer

## Short, contextual first-run hints. This layer observes presentation only;
## it never consumes input, pauses play, or changes run state.

const MOVE_HINT: StringName = &"hud.m3r.onboarding.move_jump"
const PURPOSE_HINT: StringName = &"hud.m3r.onboarding.purpose"
const TALK_HINT: StringName = &"hud.m3r.onboarding.talk"
const DIALOGUE_HINT: StringName = &"hud.m3r.onboarding.dialogue"
const PROP_HINT: StringName = &"hud.m3r.onboarding.prop"
const MOVE_DISTANCE_M := 2.25
const HUD_POLL_SECONDS := 0.15
const PROP_BIND_SECONDS := 0.5

@export var player_path := NodePath("../Town/Actors/Player3D")
@export var hud_path := NodePath("../HUD3D")

@onready var _hint_panel: PanelContainer = %HintPanel
@onready var _hint_label: Label = %HintLabel

var _player: CharacterBody3D
var _hud: Node
var _focused_target: Node
var _last_player_position := Vector3(INF, INF, INF)
var _moved_distance := 0.0
var _move_complete := false
var _jump_observed := false
var _purpose_pending := false
var _purpose_shown := false
var _talk_hint_shown := false
var _dialogue_hint_shown := false
var _prop_hint_shown := false
var _prop_handled := false
var _modal_surface := "none"
var _hud_poll_remaining := 0.0
var _prop_bind_remaining := 0.0
var _current_hint_key: StringName = &""
var _hint_remaining := -1.0
var _suppressed := false
var _hint_tween: Tween
var _bound_props: Dictionary = {}


func _ready() -> void:
	_player = get_node_or_null(player_path) as CharacterBody3D
	_hud = get_node_or_null(hud_path)
	_hint_panel.visible = false
	if _player != null:
		_last_player_position = _player.global_position
		if _player.has_signal(&"focus_changed"):
			_player.connect(&"focus_changed", _on_focus_changed)
	call_deferred("_begin_onboarding")
	call_deferred("_bind_prop_sources")


func _process(delta: float) -> void:
	if not get_tree().paused:
		_update_movement_progress()
		if Input.is_action_just_pressed(&"jump") and _player != null:
			_jump_observed = true

	_hud_poll_remaining = maxf(0.0, _hud_poll_remaining - delta)
	if is_zero_approx(_hud_poll_remaining):
		_hud_poll_remaining = HUD_POLL_SECONDS
		_poll_hud_surface()

	_prop_bind_remaining = maxf(0.0, _prop_bind_remaining - delta)
	if is_zero_approx(_prop_bind_remaining):
		_prop_bind_remaining = PROP_BIND_SECONDS
		_bind_prop_sources()

	# HUD currently calls the record/log surface "inspect". Keep "log" here as
	# a defensive alias so a presentation-only rename cannot make hints overlap it.
	if _modal_surface in ["settings", "log", "inspect", "outcome"]:
		_set_suppressed(true)
		return
	_set_suppressed(false)
	if _modal_surface == "conversation":
		if not _dialogue_hint_shown:
			_dialogue_hint_shown = true
			_show_hint(DIALOGUE_HINT, 8.0)
		_update_hint_timer(delta)
		return

	_update_hint_timer(delta)
	if _current_hint_key.is_empty():
		_show_next_free_roam_hint()


func presentation_snapshot() -> Dictionary:
	return {
		"visible": _hint_panel.visible,
		"key": str(_current_hint_key),
		"text": _hint_label.text,
		"movedDistanceM": _moved_distance,
		"moveComplete": _move_complete,
		"jumpObserved": _jump_observed,
		"purposeShown": _purpose_shown,
		"talkHintShown": _talk_hint_shown,
		"dialogueHintShown": _dialogue_hint_shown,
		"propHintShown": _prop_hint_shown,
		"propHandled": _prop_handled,
		"modalSurface": _modal_surface,
		"boundProps": _bound_props.size(),
	}


func _notification(what: int) -> void:
	if what == NOTIFICATION_TRANSLATION_CHANGED and is_instance_valid(_hint_label):
		_refresh_current_text()


func _begin_onboarding() -> void:
	_show_hint(MOVE_HINT, -1.0)


func _update_movement_progress() -> void:
	if _player == null or not is_instance_valid(_player):
		return
	var position := _player.global_position
	if not is_finite(_last_player_position.x):
		_last_player_position = position
		return
	var travel := position - _last_player_position
	_last_player_position = position
	travel.y = 0.0
	if travel.length() <= 0.85:
		_moved_distance += travel.length()
	if _move_complete or _moved_distance < MOVE_DISTANCE_M:
		return
	_move_complete = true
	_purpose_pending = true
	if _current_hint_key == MOVE_HINT:
		_clear_hint()


func _poll_hud_surface() -> void:
	if _hud == null or not is_instance_valid(_hud) or not _hud.has_method("presentation_snapshot"):
		return
	var snapshot_value: Variant = _hud.call("presentation_snapshot")
	if not snapshot_value is Dictionary:
		return
	var snapshot := snapshot_value as Dictionary
	_modal_surface = str(snapshot.get("modalSurface", "none"))
	var ui_scale := clampf(float(snapshot.get("uiScale", 1.0)), 0.8, 1.5)
	_hint_panel.scale = Vector2.ONE * ui_scale
	_hint_panel.pivot_offset = Vector2(0.0, _hint_panel.size.y)


func _show_next_free_roam_hint() -> void:
	if not _move_complete:
		_show_hint(MOVE_HINT, -1.0)
		return
	if _focused_target != null and is_instance_valid(_focused_target):
		if _is_prop(_focused_target) and not _prop_hint_shown:
			_prop_hint_shown = true
			_show_hint(PROP_HINT, 7.0)
			return
		if _is_npc(_focused_target) and not _talk_hint_shown:
			_talk_hint_shown = true
			_show_hint(TALK_HINT, 6.0)
			return
	if _purpose_pending and not _purpose_shown:
		_purpose_pending = false
		_purpose_shown = true
		_show_hint(PURPOSE_HINT, 7.0)


func _on_focus_changed(target: Node) -> void:
	_focused_target = target
	# Preserve the two opening beats long enough to be readable. The newly
	# focused interaction is retained and becomes the next contextual hint.
	if (
		not _move_complete
		or _current_hint_key == PURPOSE_HINT
		or _modal_surface != "none"
		or target == null
	):
		return
	if _is_prop(target) and not _prop_hint_shown:
		_prop_hint_shown = true
		_show_hint(PROP_HINT, 7.0)
	elif _is_npc(target) and not _talk_hint_shown:
		_talk_hint_shown = true
		_show_hint(TALK_HINT, 6.0)


func _is_npc(target: Node) -> bool:
	if target.is_in_group(&"npc_actors"):
		return true
	return target.has_method("interaction_kind") and str(target.call("interaction_kind")) == "npc"


func _is_prop(target: Node) -> bool:
	for group_name in [&"physical_props", &"carryable_props", &"holdable_props"]:
		if target.is_in_group(group_name):
			return true
	return target.has_method("interaction_kind") and str(target.call("interaction_kind")) in [
		"physical_prop",
		"prop",
	]


func _bind_prop_sources() -> void:
	var live_ids: Dictionary = {}
	var candidates: Array[Node] = []
	for group_name in [&"physical_props", &"carryable_props", &"holdable_props"]:
		for candidate_value in get_tree().get_nodes_in_group(group_name):
			if candidate_value is Node and candidate_value not in candidates:
				candidates.append(candidate_value as Node)
	for prop in candidates:
		var instance_id := prop.get_instance_id()
		live_ids[instance_id] = true
		if _bound_props.has(instance_id):
			continue
		if prop.has_signal(&"handling_event"):
			prop.connect(&"handling_event", _on_prop_handling_event.bind(prop))
		else:
			for signal_name in [&"picked_up", &"placed", &"thrown"]:
				if prop.has_signal(signal_name):
					prop.connect(signal_name, _on_prop_handled.bind(prop))
		_bound_props[instance_id] = true
	for instance_id in _bound_props.keys():
		if not live_ids.has(instance_id):
			_bound_props.erase(instance_id)


func _on_prop_handling_event(event: Dictionary, _prop: Node) -> void:
	if str(event.get("action", "")) in ["pick_up", "carry", "place", "throw"]:
		_mark_prop_handled()


func _on_prop_handled(_prop_id: Variant, _actor: Variant, _prop: Node) -> void:
	_mark_prop_handled()


func _mark_prop_handled() -> void:
	_prop_handled = true
	if _current_hint_key == PROP_HINT:
		_hint_remaining = minf(_hint_remaining, 1.25) if _hint_remaining >= 0.0 else 1.25


func _show_hint(key: StringName, duration_seconds: float) -> void:
	if key.is_empty():
		return
	if is_instance_valid(_hint_tween):
		_hint_tween.kill()
	_current_hint_key = key
	_hint_remaining = duration_seconds
	_refresh_current_text()
	_hint_panel.visible = not _suppressed
	_hint_panel.modulate.a = 0.0 if not _suppressed else 1.0
	if _suppressed:
		return
	_hint_tween = create_tween()
	_hint_tween.tween_property(_hint_panel, "modulate:a", 1.0, 0.16)


func _update_hint_timer(delta: float) -> void:
	if _current_hint_key.is_empty() or _hint_remaining < 0.0:
		return
	_hint_remaining = maxf(0.0, _hint_remaining - delta)
	if is_zero_approx(_hint_remaining):
		_clear_hint()


func _clear_hint() -> void:
	if is_instance_valid(_hint_tween):
		_hint_tween.kill()
	_current_hint_key = &""
	_hint_remaining = -1.0
	_hint_panel.visible = false
	_hint_panel.modulate.a = 1.0


func _set_suppressed(value: bool) -> void:
	if _suppressed == value:
		return
	_suppressed = value
	_hint_panel.visible = not value and not _current_hint_key.is_empty()
	if not value:
		_refresh_current_text()


func _refresh_current_text() -> void:
	if _current_hint_key.is_empty() or not is_instance_valid(_hint_label):
		return
	_hint_label.text = tr(_current_hint_key)
