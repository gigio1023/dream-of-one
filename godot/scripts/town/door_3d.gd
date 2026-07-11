class_name Door3D
extends AnimatableBody3D

const SWING_DURATION_SECONDS := 0.32
const MIN_SWING_DURATION_SECONDS := 0.05

@export var label_key: StringName = &"hud.interaction.door"
@export var door_id: StringName
@export_range(-170.0, 170.0, 1.0, "degrees") var open_angle_degrees := 95.0
@export var starts_open := false

var _closed_rotation_y := 0.0
var _swing_fraction := 0.0
var _target_open := false
var _swing_tween: Tween


func _ready() -> void:
	add_to_group(&"interactables")
	add_to_group(&"doors")
	_closed_rotation_y = rotation.y
	_target_open = starts_open
	_swing_fraction = 1.0 if starts_open else 0.0
	_apply_swing_fraction(_swing_fraction)


func get_interaction_label_key() -> StringName:
	return label_key


func get_interaction_id() -> StringName:
	return door_id


func semantic_position() -> Vector3:
	return global_transform * Vector3(0.6, 0.0, 0.0)


func interaction_kind() -> StringName:
	return &"door"


func interact(_interactor: Node3D) -> void:
	_set_open(not _target_open)


func open_for_npc() -> void:
	_set_open(true)


func close() -> void:
	_set_open(false)


func is_open() -> bool:
	return _target_open


func _set_open(value: bool) -> void:
	var target_fraction := 1.0 if value else 0.0
	if _target_open == value:
		if is_equal_approx(_swing_fraction, target_fraction):
			return
		if _swing_tween != null and _swing_tween.is_valid() and _swing_tween.is_running():
			return

	_target_open = value
	if _swing_tween != null and _swing_tween.is_valid():
		_swing_tween.kill()

	if is_equal_approx(_swing_fraction, target_fraction):
		_apply_swing_fraction(target_fraction)
		_swing_tween = null
		return

	var duration := maxf(
		MIN_SWING_DURATION_SECONDS,
		SWING_DURATION_SECONDS * absf(target_fraction - _swing_fraction)
	)
	_swing_tween = create_tween()
	_swing_tween.set_process_mode(Tween.TWEEN_PROCESS_PHYSICS)
	_swing_tween.set_trans(Tween.TRANS_SINE)
	_swing_tween.set_ease(Tween.EASE_IN_OUT)
	_swing_tween.tween_method(_apply_swing_fraction, _swing_fraction, target_fraction, duration)
	_swing_tween.finished.connect(_finish_swing.bind(target_fraction))


func _apply_swing_fraction(value: float) -> void:
	_swing_fraction = clampf(value, 0.0, 1.0)
	rotation.y = _closed_rotation_y + deg_to_rad(open_angle_degrees) * _swing_fraction


func _finish_swing(target_fraction: float) -> void:
	_apply_swing_fraction(target_fraction)
	_swing_tween = null
