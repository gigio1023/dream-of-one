class_name OnboardingOverlay
extends CanvasLayer

## Short, contextual first-run hints. This layer observes presentation only;
## it never consumes input, pauses play, or changes run state.

const MOVE_HINT: StringName = &"hud.m3r.onboarding.move_jump"
const PURPOSE_HINT: StringName = &"hud.m3r.onboarding.purpose"
const TALK_HINT: StringName = &"hud.m3r.onboarding.talk"
const DIALOGUE_HINT: StringName = &"hud.m3r.onboarding.dialogue"
const RECORD_HINT: StringName = &"hud.m3r.onboarding.records"
const PROP_HINT: StringName = &"hud.m3r.onboarding.prop"
const MOVE_DISTANCE_M := 2.25
const HUD_POLL_SECONDS := 0.15
const PROP_BIND_SECONDS := 0.5
const PLAYER_BRIEF_DURATION_SECONDS := 14.0
const PLAYER_BRIEF_FIELDS := [
	"identityKey",
	"arrivalKey",
	"uncertaintyKey",
]

@export var player_path := NodePath("../Town/Actors/Player3D")
@export var hud_path := NodePath("../HUD3D")

@onready var _brief_panel: PanelContainer = %BriefPanel
@onready var _brief_labels: Array[Label] = [
	%IdentityLine,
	%ArrivalLine,
	%UncertaintyLine,
]
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
var _record_hint_shown := false
var _prop_hint_shown := false
var _prop_handled := false
var _modal_surface := "none"
var _conversation_turn_actionable := false
var _hud_poll_remaining := 0.0
var _prop_bind_remaining := 0.0
var _current_hint_key: StringName = &""
var _hint_remaining := -1.0
var _suppressed := false
var _hint_tween: Tween
var _bound_props: Dictionary = {}
var _player_brief_keys: Array[String] = []
var _player_brief_lines: Array[String] = []
var _player_brief_configured := false
var _player_brief_remaining := 0.0


func _ready() -> void:
	_player = get_node_or_null(player_path) as CharacterBody3D
	_hud = get_node_or_null(hud_path)
	_brief_panel.visible = false
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
		_update_player_brief_visibility()
		return
	if _modal_surface == "conversation":
		# Opening the modal starts the provider-backed wait, not the player's
		# response window. Keep the one-time input lesson hidden and untimed
		# until HUD3D exposes a real enabled choice or free-text control.
		_set_suppressed(not _conversation_turn_actionable)
		_update_player_brief_visibility()
		if not _conversation_turn_actionable:
			return
		if not _dialogue_hint_shown:
			_dialogue_hint_shown = true
			_show_hint(DIALOGUE_HINT, 8.0)
		_update_hint_timer(delta)
		return
	_set_suppressed(false)
	_update_player_brief_visibility()

	_update_player_brief_timer(delta)
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
		"recordHintShown": _record_hint_shown,
		"propHintShown": _prop_hint_shown,
		"propHandled": _prop_handled,
		"modalSurface": _modal_surface,
		"conversationTurnActionable": _conversation_turn_actionable,
		"boundProps": _bound_props.size(),
		"playerBrief": {
			"configured": _player_brief_configured,
			"visible": _brief_panel.visible,
			"lines": _player_brief_lines.duplicate(),
			"remainingSeconds": _player_brief_remaining,
		},
	}


## Bind the public run brief by localization key. Missing or malformed legacy
## snapshots leave the controls-only onboarding path unchanged.
func set_player_brief(brief: Dictionary) -> void:
	if brief.is_empty():
		_clear_player_brief()
		return
	var incoming_keys: Array[String] = []
	for field_name in PLAYER_BRIEF_FIELDS:
		var key := str(brief.get(field_name, "")).strip_edges()
		if key.is_empty():
			_clear_player_brief()
			return
		incoming_keys.append(key)
	if incoming_keys == _player_brief_keys and _player_brief_configured:
		_player_brief_configured = _refresh_player_brief_text()
		_update_player_brief_visibility()
		return
	_player_brief_keys = incoming_keys
	_player_brief_lines.clear()
	_player_brief_configured = _refresh_player_brief_text()
	if not _player_brief_configured:
		_player_brief_keys.clear()
		_brief_panel.visible = false
		return
	_player_brief_remaining = PLAYER_BRIEF_DURATION_SECONDS
	_update_player_brief_visibility()


func _clear_player_brief() -> void:
	_player_brief_keys.clear()
	_player_brief_lines.clear()
	_player_brief_configured = false
	_player_brief_remaining = 0.0
	for label in _brief_labels:
		label.text = ""
	_brief_panel.visible = false


func _notification(what: int) -> void:
	if what == NOTIFICATION_TRANSLATION_CHANGED and is_instance_valid(_hint_label):
		_refresh_current_text()
		if not _player_brief_keys.is_empty():
			_player_brief_configured = _refresh_player_brief_text()
			_update_player_brief_visibility()


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
	var previous_modal_surface := _modal_surface
	_modal_surface = str(snapshot.get("modalSurface", "none"))
	_conversation_turn_actionable = bool(
		snapshot.get("conversationTurnActionable", false)
	)
	var ui_scale := clampf(float(snapshot.get("uiScale", 1.0)), 0.8, 1.5)
	_brief_panel.scale = Vector2.ONE * ui_scale
	_brief_panel.pivot_offset = Vector2(0.0, _brief_panel.size.y)
	_hint_panel.scale = Vector2.ONE * ui_scale
	_hint_panel.pivot_offset = Vector2(0.0, _hint_panel.size.y)
	if (
		previous_modal_surface == "conversation"
		and _modal_surface == "none"
		and _dialogue_hint_shown
		and not _record_hint_shown
	):
		_record_hint_shown = true
		_show_hint(RECORD_HINT, 9.0)


func _refresh_player_brief_text() -> bool:
	if _player_brief_keys.size() != PLAYER_BRIEF_FIELDS.size():
		_player_brief_lines.clear()
		return false
	var localization := get_node_or_null("/root/Localization")
	if localization == null or not localization.has_method("content_message"):
		_player_brief_lines.clear()
		return false
	var locale_name := str(localization.call("locale"))
	var resolved_lines: Array[String] = []
	for key in _player_brief_keys:
		var line := str(localization.call("content_message", locale_name, key)).strip_edges()
		if line.is_empty() or line == key:
			_player_brief_lines.clear()
			return false
		resolved_lines.append(line)
	_player_brief_lines = resolved_lines
	for index in _brief_labels.size():
		_brief_labels[index].text = _player_brief_lines[index]
	return true


func _update_player_brief_visibility() -> void:
	if not is_instance_valid(_brief_panel):
		return
	_brief_panel.visible = (
		_player_brief_configured
		and _player_brief_remaining > 0.0
		and not _suppressed
		and _modal_surface == "none"
	)


func _update_player_brief_timer(delta: float) -> void:
	if not _player_brief_configured or _player_brief_remaining <= 0.0:
		return
	# Keep the run premise available while the opening movement lesson is still
	# active. Once the player has actually moved through that lesson, leave the
	# brief up for one final readable interval.
	if not _move_complete:
		return
	_player_brief_remaining = maxf(0.0, _player_brief_remaining - delta)
	_update_player_brief_visibility()


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
	_update_player_brief_visibility()
	if not value:
		_refresh_current_text()


func _refresh_current_text() -> void:
	if _current_hint_key.is_empty() or not is_instance_valid(_hint_label):
		return
	_hint_label.text = tr(_current_hint_key)
