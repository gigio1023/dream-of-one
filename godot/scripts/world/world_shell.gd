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
	_configure_environment()
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

func _configure_environment() -> void:
	var world_environment := find_child("RuntimeWorldEnvironment", false, false) as WorldEnvironment
	if world_environment == null:
		world_environment = WorldEnvironment.new()
		world_environment.name = "RuntimeWorldEnvironment"
		add_child(world_environment)

	var environment := Environment.new()
	var sky := Sky.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.12, 0.19, 0.29, 1.0)
	sky_material.sky_horizon_color = Color(0.48, 0.57, 0.64, 1.0)
	sky_material.ground_bottom_color = Color(0.08, 0.10, 0.10, 1.0)
	sky_material.ground_horizon_color = Color(0.23, 0.28, 0.28, 1.0)
	sky_material.energy_multiplier = 1.35
	sky.sky_material = sky_material

	environment.background_mode = Environment.BG_SKY
	environment.background_energy_multiplier = 0.82
	environment.sky = sky
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(0.55, 0.64, 0.72, 1.0)
	environment.ambient_light_energy = 0.55
	environment.tonemap_mode = Environment.TONE_MAPPER_AGX
	environment.tonemap_exposure = 1.08
	environment.tonemap_agx_contrast = 1.36
	environment.tonemap_agx_white = 8.0
	environment.fog_enabled = true
	environment.fog_light_color = Color(0.46, 0.54, 0.58, 1.0)
	environment.fog_density = 0.014
	environment.fog_depth_begin = 12.0
	environment.fog_depth_end = 58.0
	environment.fog_sky_affect = 0.28
	environment.fog_aerial_perspective = 0.18
	environment.glow_enabled = true
	environment.glow_bloom = 0.06
	environment.glow_intensity = 0.16
	environment.glow_hdr_threshold = 1.35
	environment.adjustment_enabled = true
	environment.adjustment_contrast = 1.05
	environment.adjustment_saturation = 1.08
	world_environment.environment = environment
