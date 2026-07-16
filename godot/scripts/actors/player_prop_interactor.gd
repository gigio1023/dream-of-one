class_name PlayerPropInteractor
extends Node

## Local first-person carrying helper. It owns presentation/physics only.

@export var camera_path := NodePath("../Head/Camera3D")
@export var hold_anchor_path := NodePath("../Head/Camera3D/HoldAnchor")
@export_range(2.0, 12.0, 0.25) var throw_speed_mps := 6.5
@export_range(1.0, 4.0, 0.1) var max_pick_up_distance_m := 2.8

@onready var _player := get_parent() as CharacterBody3D
@onready var _camera := get_node(camera_path) as Camera3D
@onready var _hold_anchor := get_node(hold_anchor_path) as Node3D

var _held_prop: CarryableProp3D


func has_held_prop() -> bool:
	return is_instance_valid(_held_prop) and _held_prop.is_carried()


func held_prop() -> CarryableProp3D:
	return _held_prop if has_held_prop() else null


func try_pick_up(prop: CarryableProp3D) -> bool:
	if (
		prop == null
		or has_held_prop()
		or _player == null
		or prop.global_position.distance_to(_camera.global_position) > max_pick_up_distance_m
	):
		return false
	if not prop.begin_carry(_player):
		return false
	_held_prop = prop
	var exiting_callback := _on_held_prop_exiting.bind(prop)
	if not prop.tree_exiting.is_connected(exiting_callback):
		prop.tree_exiting.connect(exiting_callback, CONNECT_ONE_SHOT)
	physics_update()
	return true


func physics_update() -> void:
	if not has_held_prop():
		_held_prop = null
		return
	_held_prop.update_carried_position(_safe_hold_position())


func place() -> bool:
	if not has_held_prop():
		return false
	physics_update()
	var prop := _held_prop
	_held_prop = null
	return prop.release_from_carry(_player, Vector3.ZERO, false)


func throw() -> bool:
	if not has_held_prop():
		return false
	physics_update()
	var prop := _held_prop
	_held_prop = null
	var forward := -_camera.global_transform.basis.z.normalized()
	var inherited_velocity := _player.velocity * 0.25
	return prop.release_from_carry(
		_player,
		forward * throw_speed_mps + inherited_velocity,
		true
	)


func force_drop() -> void:
	if has_held_prop():
		place()
	else:
		_held_prop = null


func _safe_hold_position() -> Vector3:
	var origin := _camera.global_position
	var desired := _hold_anchor.global_position
	var motion := desired - origin
	if motion.is_zero_approx():
		return desired
	var query := PhysicsRayQueryParameters3D.create(origin, desired)
	query.collision_mask = 1 # Static world only; NPCs do not snap carried props into the camera.
	query.collide_with_areas = false
	query.collide_with_bodies = true
	var excluded: Array[RID] = []
	if _player != null:
		excluded.append(_player.get_rid())
	if has_held_prop():
		excluded.append(_held_prop.get_rid())
	query.exclude = excluded
	var hit := _camera.get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return desired
	var hit_position: Vector3 = hit.get("position", desired)
	var hit_distance := origin.distance_to(hit_position)
	var safe_distance := maxf(0.0, hit_distance - _held_prop.carry_wall_clearance())
	# Never let a minimum carry distance put the prop past a near wall hit.
	safe_distance = minf(
		safe_distance,
		minf(maxf(0.0, hit_distance - 0.02), motion.length())
	)
	return origin + motion.normalized() * safe_distance


func _on_held_prop_exiting(prop: CarryableProp3D) -> void:
	if _held_prop == prop:
		_held_prop = null
