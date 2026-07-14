extends CharacterBody3D
## Comfort-first first-person controller for the seamless town.
##
## The scene root is at the player's feet. This node owns only local movement,
## looking, and interaction focus; world and social truth stay outside it.

signal focus_changed(target: Node)
signal preload_intent_changed(target: Node)
signal unfocused_interaction_requested
signal settings_requested

const MIN_LOOK_SENSITIVITY := 0.01
const MAX_LOOK_SENSITIVITY := 1.0
const MIN_FIELD_OF_VIEW := 60.0
const MAX_FIELD_OF_VIEW := 100.0
const MAX_PITCH_RADIANS := deg_to_rad(85.0)
const NPC_FOCUS_GRACE_MSEC := 1500
const NPC_FOCUS_GRACE_DISTANCE_M := 3.25
const NPC_FOCUS_GRACE_MIN_FORWARD_DOT := 0.8660254
const NPC_AIM_ASSIST_DISTANCE_M := 3.0
const NPC_PRELOAD_AIM_ASSIST_DISTANCE_M := 5.0
const NPC_AIM_ASSIST_MAX_HORIZONTAL_RADIANS := deg_to_rad(32.0)
const NPC_AIM_ASSIST_MAX_VERTICAL_RADIANS := deg_to_rad(25.0)

@export_range(0.5, 8.0, 0.1, "or_greater") var walk_speed := 4.0
@export_range(1.0, 12.0, 0.1, "or_greater") var jump_velocity := 4.5
## Degrees of camera rotation per logical mouse pixel.
@export_range(0.01, 1.0, 0.01) var mouse_sensitivity := 0.12
@export var invert_y := false
@export_range(60.0, 100.0, 1.0) var field_of_view := 75.0
@export var kill_y := -10.0

@onready var _head: Node3D = $Head
@onready var _camera: Camera3D = $Head/Camera3D
@onready var _interaction_ray: RayCast3D = $Head/Camera3D/InteractionRay
@onready var _navigation_obstacle: NavigationObstacle3D = $NavigationObstacle3D
@onready var _prop_interactor: PlayerPropInteractor = $PropInteractor

var _control_enabled := true
var _focused_target: Node = null
var _preload_intent_target: Node = null
var _recent_npc_target: Node3D = null
var _recent_npc_focus_expires_msec := 0
var _respawn_transform: Transform3D
var _respawn_pitch := 0.0
var _synthetic_mouse_position := Vector2.ZERO
var _has_synthetic_mouse_position := false


func _ready() -> void:
	add_to_group("player")
	_respawn_transform = global_transform
	_respawn_pitch = _head.rotation.x
	set_look_settings(mouse_sensitivity, invert_y, field_of_view)
	capture_mouse()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("cancel") and _control_enabled:
		release_mouse()
		settings_requested.emit()
		get_viewport().set_input_as_handled()
		return

	if not _control_enabled:
		return

	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_apply_mouse_look(event as InputEventMouseMotion)
		get_viewport().set_input_as_handled()
		return

	if event.is_action_pressed("interact"):
		if not interact_focused():
			unfocused_interaction_requested.emit()
		get_viewport().set_input_as_handled()
		return

	if (
		event is InputEventMouseButton
		and (event as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT
		and (event as InputEventMouseButton).pressed
		and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
		and _prop_interactor.has_held_prop()
	):
		throw_held_prop()
		get_viewport().set_input_as_handled()
		return

	if (
		event is InputEventMouseButton
		and (event as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT
		and (event as InputEventMouseButton).pressed
		and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED
	):
		capture_mouse()
		get_viewport().set_input_as_handled()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		release_mouse()


func _physics_process(delta: float) -> void:
	if global_position.y < kill_y:
		_respawn()

	if not is_on_floor():
		velocity += get_gravity() * delta
	elif velocity.y < 0.0:
		velocity.y = 0.0
	if can_jump() and Input.is_action_just_pressed(&"jump"):
		velocity.y = jump_velocity

	var input_direction := Vector2.ZERO
	if _control_enabled:
		input_direction = Input.get_vector("move_left", "move_right", "move_up", "move_down")
		if not input_direction.is_zero_approx():
			input_direction = input_direction.normalized()

	var world_direction := global_transform.basis * Vector3(input_direction.x, 0.0, input_direction.y)
	if not world_direction.is_zero_approx():
		world_direction = world_direction.normalized()
	velocity.x = world_direction.x * walk_speed
	velocity.z = world_direction.z * walk_speed
	move_and_slide()
	_navigation_obstacle.velocity = velocity
	_prop_interactor.physics_update()

	_interaction_ray.force_raycast_update()
	var preload_target: Node = null
	if _control_enabled:
		preload_target = _aimed_npc_actor()
		if preload_target == null:
			# A resident whose opening was invalidated while moving cannot yet
			# enter the interactive-focus path. Treat the same narrow, visible
			# torso aim assist as explicit preload intent so looking at a nearby
			# person can recover their opening without pixel hunting.
			preload_target = _npc_aim_assist(
				false,
				NPC_PRELOAD_AIM_ASSIST_DISTANCE_M
			)
	_set_preload_intent_target(preload_target)
	var held_prop := _prop_interactor.held_prop()
	var focus_target: Node = held_prop
	if focus_target == null and _control_enabled:
		focus_target = _interactable_collider()
	if _control_enabled and _ready_npc_may_override(focus_target):
		var assisted_npc := _ready_npc_aim_assist()
		if assisted_npc != null:
			focus_target = assisted_npc
	_set_focused_target(focus_target)


func _apply_mouse_look(event: InputEventMouseMotion) -> void:
	var look_delta := event.screen_relative
	if look_delta.is_zero_approx():
		look_delta = event.relative
	if look_delta.is_zero_approx():
		# Godot AI 2.9.1 supplies absolute mouse positions but no relative
		# fields. Treat the first such event as a baseline and later events as
		# normal logical mouse motion. Real captured-mouse events keep using
		# screen_relative, as recommended by Godot for stretched viewports.
		if _has_synthetic_mouse_position:
			look_delta = event.position - _synthetic_mouse_position
		_synthetic_mouse_position = event.position
		_has_synthetic_mouse_position = true
	else:
		_synthetic_mouse_position = event.position
		_has_synthetic_mouse_position = true
	if look_delta.is_zero_approx():
		return
	var yaw_delta := deg_to_rad(look_delta.x * mouse_sensitivity)
	var pitch_delta := deg_to_rad(look_delta.y * mouse_sensitivity)
	rotate_y(-yaw_delta)
	if invert_y:
		_head.rotation.x += pitch_delta
	else:
		_head.rotation.x -= pitch_delta
	_head.rotation.x = clampf(_head.rotation.x, -MAX_PITCH_RADIANS, MAX_PITCH_RADIANS)


func _interactable_collider() -> Node:
	if not _interaction_ray.is_colliding():
		return null
	var collider := _interaction_ray.get_collider()
	if not collider is Node:
		return null
	return _find_interactable(collider as Node)


func _aimed_npc_actor() -> Node:
	if not _interaction_ray.is_colliding():
		return null
	var collider := _interaction_ray.get_collider()
	if not collider is Node:
		return null
	var candidate := collider as Node
	while candidate != null and candidate != self:
		if candidate.is_in_group(&"npc_actors"):
			return candidate
		candidate = candidate.get_parent()
	return null


func _ready_npc_aim_assist() -> Node:
	return _npc_aim_assist(true, NPC_AIM_ASSIST_DISTANCE_M)


func _ready_npc_may_override(exact_target: Node) -> bool:
	if exact_target == null:
		return true
	if not exact_target.has_method("interaction_kind"):
		return false
	# A ready person standing at an inspectable board should remain the primary
	# social target. Exact NPCs and physical props keep their direct-ray priority;
	# looking outside the NPC cone still exposes the record surface normally.
	return str(exact_target.call("interaction_kind")) == "record_surface"


func _npc_aim_assist(
	require_interaction_ready: bool,
	max_distance_m: float
) -> Node:
	var camera_origin := _camera.global_position
	var camera_forward := -_camera.global_transform.basis.z.normalized()
	var camera_right := _camera.global_transform.basis.x.normalized()
	var camera_up := _camera.global_transform.basis.y.normalized()

	var best_target: Node3D = null
	var best_has_contact := false
	var best_angular_error := INF
	var best_distance := INF
	for candidate_value in get_tree().get_nodes_in_group(&"npc_actors"):
		if not candidate_value is Node3D:
			continue
		var candidate := candidate_value as Node3D
		if (
			not candidate.is_visible_in_tree()
			or not candidate.has_method("get_interaction_label_key")
			or not candidate.has_method("interact")
			or not candidate.has_method("is_interaction_enabled")
			or (
				require_interaction_ready
				and not bool(candidate.call("is_interaction_enabled"))
			)
		):
			continue
		var aim_position := _npc_interaction_aim_position(candidate)
		var to_target := aim_position - camera_origin
		var distance := to_target.length()
		if distance <= 0.001 or distance > max_distance_m:
			continue
		var target_direction := to_target / distance
		var forward_amount := target_direction.dot(camera_forward)
		if forward_amount <= 0.0:
			continue
		var right_amount := target_direction.dot(camera_right)
		var up_amount := target_direction.dot(camera_up)
		if (
			absf(atan2(right_amount, forward_amount))
			> NPC_AIM_ASSIST_MAX_HORIZONTAL_RADIANS
		):
			continue
		if (
			absf(atan2(up_amount, Vector2(forward_amount, right_amount).length()))
			> NPC_AIM_ASSIST_MAX_VERTICAL_RADIANS
		):
			continue
		if not _npc_has_interaction_line_of_sight(candidate, aim_position):
			continue

		var has_contact := (
			candidate.has_method("has_player_contact")
			and bool(candidate.call("has_player_contact"))
		)
		var angular_error := acos(clampf(camera_forward.dot(target_direction), -1.0, 1.0))
		var is_better := best_target == null
		if not is_better and has_contact != best_has_contact:
			is_better = has_contact
		elif not is_better and is_equal_approx(angular_error, best_angular_error):
			if is_equal_approx(distance, best_distance):
				is_better = str(candidate.get_path()) < str(best_target.get_path())
			else:
				is_better = distance < best_distance
		elif not is_better:
			is_better = angular_error < best_angular_error
		if not is_better:
			continue
		best_target = candidate
		best_has_contact = has_contact
		best_angular_error = angular_error
		best_distance = distance
	return best_target


func _find_interactable(start: Node) -> Node:
	var candidate := start
	while candidate != null and candidate != self:
		if (
			candidate.has_method("get_interaction_label_key")
			and candidate.has_method("interact")
		):
			if (
				candidate.has_method("is_interaction_enabled")
				and not bool(candidate.call("is_interaction_enabled"))
			):
				candidate = candidate.get_parent()
				continue
			return candidate
		candidate = candidate.get_parent()
	return null


func _set_preload_intent_target(target: Node) -> void:
	if target == _preload_intent_target:
		return
	_preload_intent_target = target
	preload_intent_changed.emit(_preload_intent_target)


func _set_focused_target(target: Node) -> void:
	if target == _focused_target:
		return
	if _is_npc_interactable(target):
		_recent_npc_target = target as Node3D
		_recent_npc_focus_expires_msec = Time.get_ticks_msec() + NPC_FOCUS_GRACE_MSEC
	elif target == null and _is_npc_interactable(_focused_target):
		_recent_npc_target = _focused_target as Node3D
		_recent_npc_focus_expires_msec = Time.get_ticks_msec() + NPC_FOCUS_GRACE_MSEC
	_focused_target = target
	focus_changed.emit(_focused_target)


func _respawn() -> void:
	_prop_interactor.force_drop()
	var target_transform := _respawn_transform
	var ancestor := get_parent()
	while ancestor != null:
		if ancestor.has_method("nearest_anchor_position"):
			target_transform.origin = ancestor.call("nearest_anchor_position", global_position)
			break
		ancestor = ancestor.get_parent()
	global_transform = target_transform
	_head.rotation.x = _respawn_pitch
	_set_preload_intent_target(null)
	_clear_recent_npc_focus()
	velocity = Vector3.ZERO
	_navigation_obstacle.velocity = Vector3.ZERO
	push_warning("Player crossed kill_y and was returned to its spawn transform.")


func set_control_enabled(enabled: bool) -> void:
	_control_enabled = enabled
	if not enabled:
		# There is no inventory. Every modal/control-lock boundary places the
		# carried object before camera or player transforms can jump elsewhere.
		_prop_interactor.force_drop()
		_set_preload_intent_target(null)
		_set_focused_target(null)
		_clear_recent_npc_focus()
		velocity.x = 0.0
		velocity.z = 0.0


func can_jump() -> bool:
	return _control_enabled and is_on_floor()


func face_position(target_position: Vector3) -> void:
	var flat_target := Vector3(target_position.x, global_position.y, target_position.z)
	if not flat_target.is_equal_approx(global_position):
		look_at(flat_target, Vector3.UP)
	var local_target := _head.to_local(target_position)
	_head.rotation.x = clampf(
		-atan2(local_target.y, maxf(0.001, -local_target.z)),
		-MAX_PITCH_RADIANS,
		MAX_PITCH_RADIANS
	)


func camera_relative_direction(target_position: Vector3) -> StringName:
	var flat_direction := target_position - _camera.global_position
	flat_direction.y = 0.0
	if flat_direction.is_zero_approx():
		return &"center"
	flat_direction = flat_direction.normalized()
	var forward := -_camera.global_transform.basis.z
	forward.y = 0.0
	forward = forward.normalized()
	var right := _camera.global_transform.basis.x
	right.y = 0.0
	right = right.normalized()
	var forward_dot := flat_direction.dot(forward)
	if forward_dot < -0.35:
		return &"behind"
	var right_dot := flat_direction.dot(right)
	if absf(right_dot) <= 0.35:
		return &"center"
	return &"right" if right_dot > 0.0 else &"left"


func focused_interactable() -> Node:
	if is_instance_valid(_focused_target):
		return _focused_target
	if (
		is_instance_valid(_recent_npc_target)
		and Time.get_ticks_msec() <= _recent_npc_focus_expires_msec
		and _horizontal_distance(
			global_position,
			_recent_npc_target.global_position
		) <= NPC_FOCUS_GRACE_DISTANCE_M
		and _recent_npc_target_is_visible()
		and (
			not _recent_npc_target.has_method("is_interaction_enabled")
			or bool(_recent_npc_target.call("is_interaction_enabled"))
		)
	):
		return _recent_npc_target
	_clear_recent_npc_focus()
	return null


func preload_intent_target() -> Node:
	if is_instance_valid(_preload_intent_target):
		return _preload_intent_target
	_set_preload_intent_target(null)
	return null


func interact_focused() -> bool:
	var target := focused_interactable()
	if target == null:
		return false
	target.call("interact", self)
	# Dynamic prop prompts change after interaction even though the same object
	# remains the focus target, so force one localized HUD refresh.
	_set_focused_target(null)
	_clear_recent_npc_focus()
	var held_prop := _prop_interactor.held_prop()
	if held_prop != null:
		_set_focused_target(held_prop)
	return true


func _clear_recent_npc_focus() -> void:
	_recent_npc_target = null
	_recent_npc_focus_expires_msec = 0


func _is_npc_interactable(target: Node) -> bool:
	return target is Node3D and target.is_in_group(&"npc_actors")


func _recent_npc_target_is_visible() -> bool:
	var target_position := _npc_interaction_aim_position(_recent_npc_target)
	var to_target := target_position - _camera.global_position
	if to_target.is_zero_approx():
		return false
	var camera_forward := -_camera.global_transform.basis.z.normalized()
	if camera_forward.dot(to_target.normalized()) < NPC_FOCUS_GRACE_MIN_FORWARD_DOT:
		return false
	return _npc_has_interaction_line_of_sight(_recent_npc_target, target_position)


func _npc_interaction_aim_position(target: Node3D) -> Vector3:
	if target.has_method("get_interaction_aim_position"):
		var value: Variant = target.call("get_interaction_aim_position")
		if value is Vector3:
			return value
	return target.global_position + Vector3.UP


func _npc_has_interaction_line_of_sight(target: Node3D, target_position: Vector3) -> bool:
	var excluded_rids: Array[RID] = [get_rid()]
	var query := PhysicsRayQueryParameters3D.create(
		_camera.global_position,
		target_position,
		_interaction_ray.collision_mask,
		excluded_rids
	)
	query.collide_with_areas = true
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	var collider: Variant = hit.get("collider")
	# Inspectable boards are thin interaction overlays, not sight walls. If one
	# is the sole blocker between the camera and a ready nearby resident, look
	# through that surface once; physical props and world geometry still block.
	if collider is Node:
		var blocker := _find_interactable(collider as Node)
		if (
			blocker is CollisionObject3D
			and blocker.has_method("interaction_kind")
			and str(blocker.call("interaction_kind")) == "record_surface"
		):
			excluded_rids.append((blocker as CollisionObject3D).get_rid())
			query.exclude = excluded_rids
			hit = get_world_3d().direct_space_state.intersect_ray(query)
			collider = hit.get("collider")
	if not collider is Node:
		return false
	var candidate := collider as Node
	while candidate != null:
		if candidate == target:
			return true
		candidate = candidate.get_parent()
	return false


func _horizontal_distance(first: Vector3, second: Vector3) -> float:
	return Vector2(first.x, first.z).distance_to(Vector2(second.x, second.z))


func try_pick_up_prop(prop: CarryableProp3D) -> bool:
	return _prop_interactor.try_pick_up(prop)


func place_held_prop() -> bool:
	var placed := _prop_interactor.place()
	if placed:
		_set_focused_target(null)
	return placed


func throw_held_prop() -> bool:
	var did_throw := _prop_interactor.throw()
	if did_throw:
		_set_focused_target(null)
	return did_throw


func held_prop() -> CarryableProp3D:
	return _prop_interactor.held_prop()


func set_look_settings(sensitivity: float, inverted: bool, fov: float) -> void:
	mouse_sensitivity = clampf(sensitivity, MIN_LOOK_SENSITIVITY, MAX_LOOK_SENSITIVITY)
	invert_y = inverted
	field_of_view = clampf(fov, MIN_FIELD_OF_VIEW, MAX_FIELD_OF_VIEW)
	if is_instance_valid(_camera):
		_camera.fov = field_of_view


func capture_mouse() -> void:
	_reset_synthetic_mouse_baseline()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func release_mouse() -> void:
	_reset_synthetic_mouse_baseline()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func _reset_synthetic_mouse_baseline() -> void:
	_synthetic_mouse_position = Vector2.ZERO
	_has_synthetic_mouse_position = false
