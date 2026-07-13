extends SceneTree

## Provider-free proof that native Godot AI input can rotate the first-person
## camera and commit one non-Latin character through the normal input path.

const PLAYER_SCENE := preload("res://scenes/actors/player_3d.tscn")
const NATIVE_SAMPLE := "안"

class InputProbe:
	extends Node
	var key_press: InputEventKey
	var mouse_motions: Array[InputEventMouseMotion] = []

	func _input(event: InputEvent) -> void:
		if event is InputEventMouseMotion:
			mouse_motions.append(
				(event as InputEventMouseMotion).duplicate() as InputEventMouseMotion
			)
		elif event is InputEventKey and (event as InputEventKey).pressed:
			key_press = (event as InputEventKey).duplicate() as InputEventKey


class FocusNpc:
	extends StaticBody3D
	var interaction_count := 0
	var interaction_enabled := true

	func get_interaction_label_key() -> StringName:
		return &"test.focus_npc"

	func is_interaction_enabled() -> bool:
		return interaction_enabled

	func interact(_player: Node) -> void:
		interaction_count += 1

var _failures: Array[String] = []
var _last_preload_intent_target: Node = null


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	await process_frame
	var probe := InputProbe.new()
	root.add_child(probe)
	var helper := root.get_node_or_null("_mcp_game_helper")
	if helper == null:
		_failures.append("Godot AI game-helper autoload is missing")
		await _finish(probe, null)
		return
	var player := PLAYER_SCENE.instantiate() as CharacterBody3D
	root.add_child(player)
	player.preload_intent_changed.connect(_on_preload_intent_changed)
	await process_frame

	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	var baseline_result: Dictionary = helper.call("_game_input_mouse", {
		"event": "motion",
		"position": {"x": 500.0, "y": 400.0},
	})
	await process_frame
	var motion_result: Dictionary = helper.call("_game_input_mouse", {
		"event": "motion",
		"position": {"x": 620.0, "y": 360.0},
	})
	await process_frame
	if not bool(baseline_result.get("sent", false)) or not bool(motion_result.get("sent", false)):
		_failures.append("Godot AI mouse motion was rejected")
	elif probe.mouse_motions.size() < 2:
		_failures.append("Godot AI mouse motion did not reach normal input")
	else:
		player.call("_reset_synthetic_mouse_baseline")
		player.call("_apply_mouse_look", probe.mouse_motions[-2])
		var yaw_before := player.rotation.y
		player.call("_apply_mouse_look", probe.mouse_motions[-1])
		if is_equal_approx(player.rotation.y, yaw_before):
			_failures.append("first-person camera ignored absolute Godot AI mouse motion")

	var key_result: Dictionary = helper.call("_game_input_key", {
		"key": NATIVE_SAMPLE,
		"pressed": true,
		"echo": false,
	})
	await process_frame
	if not bool(key_result.get("sent", false)):
		_failures.append("Godot AI native-script key was rejected")
	elif probe.key_press == null:
		_failures.append("Godot AI native-script key did not reach normal input")
	elif probe.key_press.unicode != NATIVE_SAMPLE.unicode_at(0):
		_failures.append("Godot AI native-script key lost its Unicode codepoint")

	var focus_npc := FocusNpc.new()
	focus_npc.interaction_enabled = false
	focus_npc.add_to_group(&"npc_actors")
	focus_npc.position = Vector3(0.0, 0.0, -2.0)
	var npc_shape := CollisionShape3D.new()
	var npc_capsule := CapsuleShape3D.new()
	npc_capsule.radius = 0.35
	npc_capsule.height = 1.8
	npc_shape.position = Vector3.UP * 0.9
	npc_shape.shape = npc_capsule
	focus_npc.add_child(npc_shape)
	root.add_child(focus_npc)
	player.rotation = Vector3.ZERO
	(player.get_node("Head") as Node3D).rotation.x = 0.0
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != focus_npc:
		_failures.append("disabled NPC did not remain visible to raw preload aim")
	if _last_preload_intent_target != focus_npc:
		_failures.append("raw preload aim did not emit its independent intent signal")
	if player.call("focused_interactable") != null:
		_failures.append("disabled NPC leaked into the gated HUD/E focus path")
	if bool(player.call("interact_focused")) or focus_npc.interaction_count != 0:
		_failures.append("disabled NPC accepted gated E interaction")
	focus_npc.interaction_enabled = true
	await physics_frame
	player.call("_set_focused_target", focus_npc)
	player.call("_set_focused_target", null)
	if not bool(player.call("interact_focused")) or focus_npc.interaction_count != 1:
		_failures.append("first-person interaction lost a recently focused moving NPC")
	player.call("_set_focused_target", focus_npc)
	player.call("_set_focused_target", null)
	player.rotate_y(PI)
	if bool(player.call("interact_focused")):
		_failures.append("moving-NPC focus grace allowed an off-screen interaction")
	player.rotate_y(-PI)
	var occluder := StaticBody3D.new()
	occluder.position = Vector3(0.0, 0.9, -1.0)
	var occluder_shape := CollisionShape3D.new()
	var occluder_box := BoxShape3D.new()
	occluder_box.size = Vector3(1.0, 2.0, 0.2)
	occluder_shape.shape = occluder_box
	occluder.add_child(occluder_shape)
	root.add_child(occluder)
	await physics_frame
	player.call("_set_focused_target", focus_npc)
	player.call("_set_focused_target", null)
	if bool(player.call("interact_focused")):
		_failures.append("moving-NPC focus grace passed through an occluding wall")
	occluder.queue_free()
	focus_npc.queue_free()

	await _finish(probe, player)


func _on_preload_intent_changed(target: Node) -> void:
	_last_preload_intent_target = target


func _finish(probe: Node, player: Node) -> void:
	if player != null:
		player.queue_free()
	probe.queue_free()
	await process_frame
	if not _failures.is_empty():
		for failure in _failures:
			push_error(failure)
		quit(1)
		return
	print("Godot AI input smoke passed: mouse look, Unicode, raw preload aim, gated E, and safe NPC focus grace")
	quit()
