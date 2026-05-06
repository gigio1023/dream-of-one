extends CharacterBody3D

@export var move_speed: float = 5.0
@export var look_sensitivity: float = 0.008
@export var keyboard_look_speed_degrees: float = 95.0
@export var camera_pitch_min_degrees: float = -45.0
@export var camera_pitch_max_degrees: float = 25.0

var _yaw := 0.0
var _pitch := 0.0

@onready var _camera_pivot: Node3D = $CameraPivot

func _ready() -> void:
	add_to_group("player")
	_yaw = rotation.y
	_pitch = clamp(
		_camera_pivot.rotation.x,
		deg_to_rad(camera_pitch_min_degrees),
		deg_to_rad(camera_pitch_max_degrees)
	)
	_camera_pivot.rotation.x = _pitch

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		_apply_look_delta(
			event.relative.x * look_sensitivity,
			event.relative.y * look_sensitivity
		)

func _process(delta: float) -> void:
	var look_vector := Input.get_vector(
		&"look_left",
		&"look_right",
		&"look_up",
		&"look_down"
	)
	if look_vector.is_zero_approx():
		return

	var keyboard_delta := deg_to_rad(keyboard_look_speed_degrees) * delta
	_apply_look_delta(look_vector.x * keyboard_delta, look_vector.y * keyboard_delta)

func _physics_process(delta: float) -> void:
	var input_vector := Input.get_vector(
		&"move_left",
		&"move_right",
		&"move_forward",
		&"move_back"
	)
	var direction := (global_transform.basis * Vector3(input_vector.x, 0.0, input_vector.y)).normalized()
	velocity.x = direction.x * move_speed
	velocity.z = direction.z * move_speed

	if not is_on_floor():
		velocity.y -= ProjectSettings.get_setting("physics/3d/default_gravity") * delta
	else:
		velocity.y = 0.0

	move_and_slide()

func place_at(position: Vector3, yaw_degrees: float) -> void:
	global_position = position
	_yaw = deg_to_rad(yaw_degrees)
	rotation.y = _yaw

func look_state() -> Dictionary:
	return {
		"yaw": _yaw,
		"pitch": _pitch
	}

func _apply_look_delta(horizontal_delta: float, vertical_delta: float) -> void:
	_yaw -= horizontal_delta
	_pitch -= vertical_delta
	_pitch = clamp(
		_pitch,
		deg_to_rad(camera_pitch_min_degrees),
		deg_to_rad(camera_pitch_max_degrees)
	)
	rotation.y = _yaw
	_camera_pivot.rotation.x = _pitch
