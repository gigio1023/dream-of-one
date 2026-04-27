extends Node3D

const WorldGenerator := preload("res://scripts/world/world_generator.gd")

@export_file("*.json") var layout_path := "res://data/world_layout.json"

var layout: Dictionary = {}
var build_report: Dictionary = {}

@onready var _world_root: Node3D = $World
@onready var _actors_root: Node3D = $Actors
@onready var _player: CharacterBody3D = $Actors/Player

func _ready() -> void:
	add_to_group("shell_roots")
	layout = _load_layout(layout_path)
	if layout.is_empty():
		push_error("Godot shell layout failed to load: %s" % layout_path)
		return

	build_report = WorldGenerator.build_world(layout, _world_root, _actors_root, _player)
	set_meta("world_id", layout.get("world_id", ""))
	set_meta("world_revision", layout.get("world_revision", ""))
	set_meta("runtime_path", layout.get("runtime_path", ""))
	set_meta("build_report", build_report)
	set_meta("generation_failures", build_report.get("generation_failures", []))

func _load_layout(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("Missing world layout: %s" % path)
		return {}

	var raw := FileAccess.get_file_as_string(path)
	var parsed = JSON.parse_string(raw)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("World layout is not a JSON object: %s" % path)
		return {}

	return parsed
