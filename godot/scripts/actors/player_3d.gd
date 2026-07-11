extends CharacterBody3D
## Comfort-first first-person controller for the seamless town.
##
## The scene root is at the player's feet. This node owns only local movement,
## looking, and interaction focus; world and social truth stay outside it.

signal focus_changed(target: Node)
signal settings_requested

const MIN_LOOK_SENSITIVITY := 0.01
const MAX_LOOK_SENSITIVITY := 1.0
const MIN_FIELD_OF_VIEW := 60.0
const MAX_FIELD_OF_VIEW := 100.0
const MAX_PITCH_RADIANS := deg_to_rad(85.0)

@export_range(0.5, 8.0, 0.1, "or_greater") var walk_speed := 4.0
## Degrees of camera rotation per logical mouse pixel.
@export_range(0.01, 1.0, 0.01) var mouse_sensitivity := 0.12
@export var invert_y := false
@export_range(60.0, 100.0, 1.0) var field_of_view := 75.0
@export var kill_y := -10.0

@onready var _head: Node3D = $Head
@onready var _camera: Camera3D = $Head/Camera3D
@onready var _interaction_ray: RayCast3D = $Head/Camera3D/InteractionRay
@onready var _navigation_obstacle: NavigationObstacle3D = $NavigationObstacle3D

var _control_enabled := true
var _focused_target: Node = null
var _respawn_transform: Transform3D
var _respawn_pitch := 0.0


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
		interact_focused()
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

	_interaction_ray.force_raycast_update()
	_set_focused_target(_interactable_collider())


func _apply_mouse_look(event: InputEventMouseMotion) -> void:
	var yaw_delta := deg_to_rad(event.screen_relative.x * mouse_sensitivity)
	var pitch_delta := deg_to_rad(event.screen_relative.y * mouse_sensitivity)
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


func _set_focused_target(target: Node) -> void:
	if target == _focused_target:
		return
	_focused_target = target
	focus_changed.emit(_focused_target)


func _respawn() -> void:
	var target_transform := _respawn_transform
	var ancestor := get_parent()
	while ancestor != null:
		if ancestor.has_method("nearest_anchor_position"):
			target_transform.origin = ancestor.call("nearest_anchor_position", global_position)
			break
		ancestor = ancestor.get_parent()
	global_transform = target_transform
	_head.rotation.x = _respawn_pitch
	velocity = Vector3.ZERO
	_navigation_obstacle.velocity = Vector3.ZERO
	push_warning("Player crossed kill_y and was returned to its spawn transform.")


func set_control_enabled(enabled: bool) -> void:
	_control_enabled = enabled
	if not enabled:
		velocity.x = 0.0
		velocity.z = 0.0


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


func focused_interactable() -> Node:
	if is_instance_valid(_focused_target):
		return _focused_target
	return null


func interact_focused() -> bool:
	var target := focused_interactable()
	if target == null:
		return false
	target.call("interact", self)
	return true


func set_look_settings(sensitivity: float, inverted: bool, fov: float) -> void:
	mouse_sensitivity = clampf(sensitivity, MIN_LOOK_SENSITIVITY, MAX_LOOK_SENSITIVITY)
	invert_y = inverted
	field_of_view = clampf(fov, MIN_FIELD_OF_VIEW, MAX_FIELD_OF_VIEW)
	if is_instance_valid(_camera):
		_camera.fov = field_of_view


func capture_mouse() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func release_mouse() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
