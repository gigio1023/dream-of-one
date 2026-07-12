class_name RecordSurface3D
extends StaticBody3D
## Presentation-only binding for a semantic text surface in world_layout.json.
##
## Record truth and encounter validation remain in RunService. This node only
## exposes the stable surface id selected by the player's interaction ray.

signal record_surface_requested(surface_id: String)

@export var surface_id := ""
@export var label_key: StringName = &""
@export_enum("record_surface", "hearing_notice") var surface_kind := "record_surface"
@export var affects_navigation := false


func _ready() -> void:
	add_to_group(&"semantic_targets")
	if surface_kind == "record_surface":
		add_to_group(&"interactables")
		add_to_group(&"record_surfaces")
		if affects_navigation:
			add_to_group(&"town_navigation_source")


func get_semantic_id() -> String:
	return surface_id


func get_interaction_label_key() -> StringName:
	return &"hud.interaction.record"


func get_interaction_target_key() -> StringName:
	return label_key


func interaction_kind() -> StringName:
	return &"record_surface" if surface_kind == "record_surface" else &"hearing_notice"


func is_interaction_enabled() -> bool:
	return surface_kind == "record_surface" and not surface_id.is_empty()


func interact(_interactor: Node3D) -> void:
	if not is_interaction_enabled():
		return
	record_surface_requested.emit(surface_id)
