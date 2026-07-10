extends Node2D
## NPC — a standing role actor with a one-color role accent, a reaction marker,
## and a speech-bubble anchor. Surveillance is drawn, not narrated
## (docs/art/art-direction.md): reactions and utterances appear in-world.

const PackAtlas := preload("res://scripts/data/pack_atlas.gd")

@onready var _sprite: AnimatedSprite2D = $Sprite
@onready var _marker: Label = $ReactionMarker
@onready var _bubble: Label = $SpeechBubble

var actor_id := ""
var label_text := ""
var role_text := ""
var accent := Color(0.9, 0.9, 0.9)
var state_reaction := "calm"
var reaction_label := ""
var last_utterance := ""
var _sprite_block := 1
var _facing := "down"

func configure(data: Dictionary) -> void:
	actor_id = str(data.get("actorId", ""))
	label_text = str(data.get("label", ""))
	role_text = str(data.get("role", ""))
	_sprite_block = int(data.get("sprite", 1))
	_facing = str(data.get("facing", "down"))
	var accent_hex := str(data.get("accent", "#e6e6e6"))
	if accent_hex.is_valid_html_color():
		accent = Color(accent_hex)
	if is_inside_tree():
		_apply()

func _ready() -> void:
	add_to_group("npc_actors")
	_apply()

func _apply() -> void:
	if _sprite == null:
		return
	_sprite.sprite_frames = PackAtlas.character_frames(_sprite_block)
	_sprite.offset = Vector2(0, -8)
	_sprite.play("idle_%s" % _facing)
	_marker.visible = false
	_bubble.visible = false
	$InteractionArea.set_meta("kind", "npc")
	$InteractionArea.set_meta("id", actor_id)
	queue_redraw()

func _draw() -> void:
	# Role accent: a soft ring under the feet, readable before any inspection.
	draw_circle(Vector2(0, -1), 5.0, Color(accent.r, accent.g, accent.b, 0.35))
	draw_arc(Vector2(0, -1), 5.0, 0.0, TAU, 20, Color(accent.r, accent.g, accent.b, 0.9), 1.0)

func set_reaction(reaction: String, label: String) -> void:
	state_reaction = reaction
	reaction_label = label
	var calm := reaction == "calm" or reaction == "settled"
	_marker.visible = not calm and not label.is_empty()
	_marker.text = label
	_marker.modulate = Color(1, 0.82, 0.4) if not calm else Color(1, 1, 1)

func show_speech(text: String) -> void:
	last_utterance = text
	if text.is_empty():
		_bubble.visible = false
		return
	_bubble.text = text
	_bubble.visible = true

func clear_speech() -> void:
	_bubble.visible = false

func face(dir: String) -> void:
	_facing = dir
	if _sprite != null:
		_sprite.play("idle_%s" % dir)

## Inspection payload (열람/기록/오간 말) for the HUD InspectPanel.
func inspect_payload() -> Dictionary:
	return {
		"kind": "npc",
		"id": actor_id,
		"title": label_text,
		"role": role_text,
		"reaction": reaction_label if not reaction_label.is_empty() else state_reaction,
		"utterance": last_utterance,
	}
