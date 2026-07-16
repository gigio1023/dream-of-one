extends Node3D

const WALK_START_Z := 0.4
const WALK_END_Z := 5.6
const WALK_SPEED_METERS_PER_SECOND := 1.2
const IDLE_SECONDS := 1.0

@onready var walker: Node3D = %CharacterWalker

var _walk_direction := 1.0
var _idle_seconds_remaining := IDLE_SECONDS
var _animation_player: AnimationPlayer


func _ready() -> void:
	_animation_player = _find_animation_player(walker)
	if _animation_player != null and _animation_player.has_animation(&"Idle"):
		_animation_player.play(&"Idle")
		walker.set_meta(&"idle_animation_ready", true)


func _process(delta: float) -> void:
	if _idle_seconds_remaining > 0.0:
		_idle_seconds_remaining -= delta
		if _idle_seconds_remaining <= 0.0:
			_start_walk()
		return
	walker.position.z += _walk_direction * WALK_SPEED_METERS_PER_SECOND * delta
	if walker.position.z >= WALK_END_Z:
		walker.position.z = WALK_END_Z
		_walk_direction = -1.0
		walker.rotation.y = PI
	elif walker.position.z <= WALK_START_Z:
		walker.position.z = WALK_START_Z
		_walk_direction = 1.0
		walker.rotation.y = 0.0


func begin_walk_immediately() -> void:
	_idle_seconds_remaining = 0.0
	_start_walk()


func _start_walk() -> void:
	if _animation_player != null and _animation_player.has_animation(&"Walk"):
		_animation_player.play(&"Walk")
		walker.set_meta(&"walk_animation_ready", true)


func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node as AnimationPlayer
	for child in node.get_children():
		var found := _find_animation_player(child)
		if found != null:
			return found
	return null
