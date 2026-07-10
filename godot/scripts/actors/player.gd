extends CharacterBody2D
## Player — 4-direction top-down walker with an interaction probe.
## Truth stays in Session; the player only moves, faces, and reports the nearest
## Interactable so Main can open a conversation or inspect a record prop.

const PackAtlas := preload("res://scripts/data/pack_atlas.gd")
const SPEED := 62.0
const SPRITE_BLOCK := 0

@onready var _sprite: AnimatedSprite2D = $Sprite
@onready var _probe: Area2D = $InteractionProbe

var input_enabled := true
var _facing := "up"
var _focused_area: Area2D = null

func _ready() -> void:
	add_to_group("player")
	_sprite.sprite_frames = PackAtlas.character_frames(SPRITE_BLOCK)
	_sprite.play("idle_up")
	queue_redraw()

func _draw() -> void:
	var accent := Color("#7ec8a0")
	draw_circle(Vector2(0, -1), 5.0, Color(accent.r, accent.g, accent.b, 0.28))
	draw_arc(Vector2(0, -1), 5.0, 0.0, TAU, 20, Color(accent.r, accent.g, accent.b, 0.9), 1.0)

func _physics_process(_delta: float) -> void:
	if not input_enabled:
		velocity = Vector2.ZERO
		_play_idle()
		return
	var dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	velocity = dir * SPEED
	move_and_slide()
	if dir.length() > 0.1:
		_facing = _facing_from_vector(dir)
		_probe.position = _facing_offset()
		_sprite.play("walk_%s" % _facing)
	else:
		_play_idle()

func _play_idle() -> void:
	var anim := "idle_%s" % _facing
	if _sprite.animation != anim or not _sprite.is_playing():
		_sprite.play(anim)

func _facing_from_vector(dir: Vector2) -> String:
	if abs(dir.x) > abs(dir.y):
		return "right" if dir.x > 0 else "left"
	return "down" if dir.y > 0 else "up"

func _facing_offset() -> Vector2:
	match _facing:
		"up":
			return Vector2(0, -12)
		"down":
			return Vector2(0, 12)
		"left":
			return Vector2(-12, 0)
		_:
			return Vector2(12, 0)

func facing() -> String:
	return _facing

## Nearest Interactable (npc or record prop) overlapping the probe, or null.
func focused_interactable() -> Area2D:
	var best: Area2D = null
	var best_dist := INF
	for area in _probe.get_overlapping_areas():
		if not area.is_in_group("interactable"):
			continue
		var d := global_position.distance_to(area.global_position)
		if d < best_dist:
			best_dist = d
			best = area
	return best

func set_focused_area(area: Area2D) -> void:
	if _focused_area == area:
		return
	if is_instance_valid(_focused_area):
		var previous := _focused_area.get_parent()
		if previous != null and previous.has_method("set_focused"):
			previous.call("set_focused", false)
	_focused_area = area
	if is_instance_valid(_focused_area):
		var current := _focused_area.get_parent()
		if current != null and current.has_method("set_focused"):
			current.call("set_focused", true)
