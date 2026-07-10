extends Node2D
## Record prop — a readable in-world artifact (counter, usual-order cue, receipt
## tray, correction slip, report tray, queue marker, station dossier). Its
## readability comes from silhouette + a state label; inspecting it opens the
## HUD InspectPanel with 열람/기록 detail. See docs/game/glossary.md (Record).

const PackAtlas := preload("res://scripts/data/pack_atlas.gd")

@onready var _sprite: Sprite2D = $Sprite
@onready var _state_label: Label = $StateLabel

var prop_id := ""
var label_text := ""
var desc_text := ""
var state := ""
var readers: Array = []
var _tile_index := 251
var _texture_path := ""

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
	_refresh_state_label()

func set_state(new_state: String) -> void:
	if new_state.is_empty():
		return
	state = new_state
	_refresh_state_label()
	# Brief highlight so a ledger-driven state change reads within 1s.
	_sprite.modulate = Color(1.4, 1.25, 0.7)
	var tween := create_tween()
	tween.tween_property(_sprite, "modulate", Color(1, 1, 1), 0.5)

func _refresh_state_label() -> void:
	var loc := get_node_or_null("/root/Localization")
	var state_str := state
	if loc != null and not state.is_empty():
		state_str = str(loc.call("t", "state.%s" % state))
	_state_label.text = "%s\n%s" % [label_text, state_str]

func inspect_payload() -> Dictionary:
	return {
		"kind": "prop",
		"id": prop_id,
		"title": label_text,
		"desc": desc_text,
		"state": state,
		"readers": readers,
	}
