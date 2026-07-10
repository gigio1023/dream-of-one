extends Node2D
## Record prop — a readable in-world artifact (counter, usual-order cue, receipt
## tray, correction slip, report tray, queue marker, station dossier). Its
## readability comes from silhouette + a projected native state chip;
## inspecting it opens the HUD InspectPanel with 열람/기록 detail. See
## docs/game/glossary.md (Record).

const PackAtlas := preload("res://scripts/data/pack_atlas.gd")

@onready var _sprite: Sprite2D = $Sprite
var prop_id := ""
var label_text := ""
var desc_text := ""
var state := ""
var _state_text := ""
var readers: Array = []
var _tile_index := 251
var _texture_path := ""
var _focused := false
var _state_visible := false
var _state_revision := 0

func configure(data: Dictionary) -> void:
	prop_id = str(data.get("propId", ""))
	label_text = str(data.get("label", ""))
	desc_text = str(data.get("desc", ""))
	state = str(data.get("state", ""))
	readers = data.get("readers", [])
	_tile_index = int(data.get("tile", 251))
	_texture_path = str(data.get("texture", ""))
	if is_inside_tree():
		_apply()

func _ready() -> void:
	add_to_group("record_props")
	$InteractionArea.add_to_group("interactable")
	_apply()

func _apply() -> void:
	if _sprite == null:
		return
	if not _texture_path.is_empty():
		_sprite.texture = load(_texture_path)
	else:
		_sprite.texture = PackAtlas.tile_texture(_tile_index)
	_sprite.offset = Vector2(0, -8)
	$InteractionArea.set_meta("kind", "prop")
	$InteractionArea.set_meta("id", prop_id)
	$DebugLabel.text = "%s · %s" % [prop_id, state]
	_refresh_state_label()
	_state_visible = false

func set_state(new_state: String) -> void:
	if new_state.is_empty():
		return
	state = new_state
	_state_revision += 1
	var revision := _state_revision
	_refresh_state_label()
	_state_visible = true
	# Brief highlight so a ledger-driven state change reads within 1s.
	_sprite.modulate = Color(1.4, 1.25, 0.7)
	var tween := create_tween()
	tween.tween_property(_sprite, "modulate", Color(1, 1, 1), 0.5)
	tween.tween_interval(0.35)
	tween.tween_callback(func() -> void:
		if revision == _state_revision:
			_state_visible = _focused
	)

func set_focused(value: bool) -> void:
	_focused = value
	_sprite.modulate = Color(1.35, 1.25, 0.78) if value else Color.WHITE
	_state_visible = value

func _refresh_state_label() -> void:
	var loc := get_node_or_null("/root/Localization")
	var state_str := state
	if loc != null and not state.is_empty():
		state_str = str(loc.call("t", "state.%s" % state))
	_state_text = state_str
	if is_instance_valid($DebugLabel):
		$DebugLabel.text = "%s · %s" % [prop_id, state]

func set_debug_visible(value: bool) -> void:
	$DebugLabel.visible = value

func inspect_payload() -> Dictionary:
	return {
		"kind": "prop",
		"id": prop_id,
		"title": label_text,
		"desc": desc_text,
		"state": state,
		"readers": readers,
	}

func overlay_payload() -> Dictionary:
	return {
		"propId": prop_id,
		"label": label_text,
		"state": _state_text,
		"stateVisible": _state_visible,
		"worldPosition": global_position + Vector2(0, 7),
		"subjectWorldPosition": global_position + Vector2(0, -8),
		"subjectWorldSize": Vector2(18, 20),
	}
