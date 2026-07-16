class_name CarryableProp3D
extends RigidBody3D

## One small, physics-backed object that the first-person player can handle.
##
## The node emits engine-observed facts only. Main3D forwards those facts to
## RunService, which remains the sole owner of NPC memory and social meaning.

signal picked_up(prop_id: String, actor: Node3D)
signal carried(prop_id: String, actor: Node3D)
signal placed(prop_id: String, actor: Node3D)
signal thrown(prop_id: String, actor: Node3D)
signal impact(prop_id: String, speed: float)
signal handling_event(event: Dictionary)

const INTERACTION_PICK_UP_KEY := &"hud.m3r.interaction.prop_pick_up"
const INTERACTION_HELD_KEY := &"hud.m3r.interaction.prop_throw"
const IMPACT_MIN_SPEED := 0.8
const IMPACT_COOLDOWN_MSEC := 120
const PLAYER_COLLISION_GRACE_SECONDS := 0.22

@export var prop_id := ""
@export var label_key: StringName
@export_range(0.1, 1.0, 0.05) var wall_clearance_m := 0.35
@export_range(1.0, 30.0, 0.5) var observation_distance_m := 12.0
@export_range(2.0, 12.0, 0.25) var max_release_speed_mps := 8.0
@export_range(0.1, 3.0, 0.1) var carry_event_distance_m := 0.8
@export var kill_y := -8.0

var _held_by: Node3D
var _saved_collision_layer := 0
var _saved_collision_mask := 0
var _carried_distance := 0.0
var _carry_event_emitted := false
var _last_speed := 0.0
var _last_impact_msec := -IMPACT_COOLDOWN_MSEC
var _collision_exception_actor: PhysicsBody3D
var _collision_exception_remaining := 0.0
var _spawn_transform: Transform3D


func _ready() -> void:
	for group_name in [
		&"physical_props",
		&"carryable_props",
		&"holdable_props",
		&"spatial_props",
		&"interactables",
	]:
		add_to_group(group_name)
	_saved_collision_layer = collision_layer
	_saved_collision_mask = collision_mask
	_spawn_transform = global_transform
	contact_monitor = true
	max_contacts_reported = maxi(4, max_contacts_reported)
	continuous_cd = true
	if not body_entered.is_connected(_on_body_entered):
		body_entered.connect(_on_body_entered)
	if prop_id.is_empty():
		push_error("CarryableProp3D requires a stable prop_id.")
	if label_key.is_empty():
		push_error("CarryableProp3D requires a localized label_key.")


func _physics_process(delta: float) -> void:
	if global_position.y < kill_y:
		reset_to_spawn()
	if not is_carried():
		_last_speed = linear_velocity.length()
	if _collision_exception_actor == null:
		return
	_collision_exception_remaining = maxf(0.0, _collision_exception_remaining - delta)
	if is_zero_approx(_collision_exception_remaining):
		remove_collision_exception_with(_collision_exception_actor)
		_collision_exception_actor = null


func get_interaction_label_key() -> StringName:
	return INTERACTION_HELD_KEY if is_carried() else INTERACTION_PICK_UP_KEY


func get_label_key() -> StringName:
	return label_key


func is_interaction_enabled() -> bool:
	return not prop_id.is_empty()


func interact(interactor: Node) -> void:
	if not interactor is Node3D:
		return
	if is_carried():
		if interactor == _held_by and interactor.has_method("place_held_prop"):
			interactor.call("place_held_prop")
		return
	if interactor.has_method("try_pick_up_prop"):
		interactor.call("try_pick_up_prop", self)


func is_carried() -> bool:
	return is_instance_valid(_held_by)


func held_by() -> Node3D:
	return _held_by if is_carried() else null


func carry_wall_clearance() -> float:
	return wall_clearance_m


func begin_carry(actor: Node3D) -> bool:
	if actor == null or is_carried() or prop_id.is_empty():
		return false
	_remove_player_collision_exception()
	_held_by = actor
	_carried_distance = 0.0
	_carry_event_emitted = false
	_emit_handling_event("pick_up", actor)
	picked_up.emit(prop_id, actor)
	freeze_mode = RigidBody3D.FREEZE_MODE_STATIC
	freeze = true
	sleeping = false
	linear_velocity = Vector3.ZERO
	angular_velocity = Vector3.ZERO
	collision_layer = 0
	collision_mask = 0
	return true


func update_carried_position(target_position: Vector3) -> void:
	if not is_carried():
		return
	_carried_distance += global_position.distance_to(target_position)
	global_position = target_position
	linear_velocity = Vector3.ZERO
	angular_velocity = Vector3.ZERO
	if not _carry_event_emitted and _carried_distance >= carry_event_distance_m:
		_carry_event_emitted = true
		_emit_handling_event("carry", _held_by)
		carried.emit(prop_id, _held_by)


func release_from_carry(actor: Node3D, release_velocity: Vector3, is_throw: bool) -> bool:
	if not is_carried() or actor != _held_by:
		return false
	var handling_actor := _held_by
	_held_by = null
	collision_layer = _saved_collision_layer
	collision_mask = _saved_collision_mask
	freeze = false
	sleeping = false
	var bounded_velocity := release_velocity
	if bounded_velocity.length() > max_release_speed_mps:
		bounded_velocity = bounded_velocity.normalized() * max_release_speed_mps
	linear_velocity = bounded_velocity if is_throw else Vector3.ZERO
	angular_velocity = (
		Vector3(0.0, bounded_velocity.length() * 0.35, 0.0)
		if is_throw
		else Vector3.ZERO
	)
	_add_player_collision_exception(handling_actor)
	if is_throw:
		_emit_handling_event("throw", handling_actor)
		thrown.emit(prop_id, handling_actor)
	else:
		_emit_handling_event("place", handling_actor)
		placed.emit(prop_id, handling_actor)
	return true


func force_drop() -> void:
	if not is_carried():
		return
	release_from_carry(_held_by, Vector3.ZERO, false)


func reset_to_spawn() -> void:
	_held_by = null
	_remove_player_collision_exception()
	collision_layer = _saved_collision_layer
	collision_mask = _saved_collision_mask
	freeze = true
	global_transform = _spawn_transform
	linear_velocity = Vector3.ZERO
	angular_velocity = Vector3.ZERO
	freeze = false
	sleeping = false


func _add_player_collision_exception(actor: Node3D) -> void:
	if not actor is PhysicsBody3D:
		return
	_collision_exception_actor = actor as PhysicsBody3D
	add_collision_exception_with(_collision_exception_actor)
	_collision_exception_remaining = PLAYER_COLLISION_GRACE_SECONDS


func _remove_player_collision_exception() -> void:
	if _collision_exception_actor != null:
		remove_collision_exception_with(_collision_exception_actor)
	_collision_exception_actor = null
	_collision_exception_remaining = 0.0


func _on_body_entered(_body: Node) -> void:
	if is_carried():
		return
	var speed := maxf(_last_speed, linear_velocity.length())
	var now := Time.get_ticks_msec()
	if speed < IMPACT_MIN_SPEED or now - _last_impact_msec < IMPACT_COOLDOWN_MSEC:
		return
	_last_impact_msec = now
	impact.emit(prop_id, speed)


func _emit_handling_event(action: String, actor: Node3D) -> void:
	if actor == null:
		return
	handling_event.emit({
		"propId": prop_id,
		"action": action,
		"playerPosition": _vector3_to_array(actor.global_position),
		"objectPosition": _vector3_to_array(global_position),
		"observers": _observer_facts(actor),
	})


func _observer_facts(player_actor: Node3D) -> Array[Dictionary]:
	var actors: Array[Node3D] = []
	for actor_value in get_tree().get_nodes_in_group(&"npc_actors"):
		if actor_value is Node3D and not str((actor_value as Node).get("actor_id")).is_empty():
			actors.append(actor_value as Node3D)
	actors.sort_custom(func(a: Node3D, b: Node3D) -> bool:
		return str(a.get("actor_id")) < str(b.get("actor_id"))
	)
	var facts: Array[Dictionary] = []
	var space_state := get_world_3d().direct_space_state
	for actor in actors:
		facts.append({
			"actorId": str(actor.get("actor_id")),
			"visible": _observer_can_see_action(actor, player_actor, space_state),
		})
	return facts


func _observer_can_see_action(
	observer: Node3D,
	player_actor: Node3D,
	space_state: PhysicsDirectSpaceState3D
) -> bool:
	var origin := observer.global_position + Vector3.UP * 1.35
	var target := global_position
	if origin.distance_to(target) > observation_distance_m:
		return false
	if origin.is_equal_approx(target):
		return true
	var query := PhysicsRayQueryParameters3D.create(origin, target)
	query.collision_mask = 23 # World + player + NPC + physical prop.
	query.collide_with_areas = false
	query.collide_with_bodies = true
	if observer is CollisionObject3D:
		query.exclude = [(observer as CollisionObject3D).get_rid()]
	var hit := space_state.intersect_ray(query)
	if hit.is_empty():
		# A carried prop has collision disabled; no blocker means the endpoint is visible.
		return true
	var collider_value: Variant = hit.get("collider")
	return (
		collider_value is Node
		and (
			_node_belongs_to(collider_value as Node, self)
			or _node_belongs_to(collider_value as Node, player_actor)
		)
	)


func _node_belongs_to(node: Node, owner_node: Node) -> bool:
	var current: Node = node
	while current != null:
		if current == owner_node:
			return true
		current = current.get_parent()
	return false


func _vector3_to_array(value: Vector3) -> Array[float]:
	return [value.x, value.y, value.z]
