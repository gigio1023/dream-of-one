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

var _failures: Array[String] = []


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

	await _finish(probe, player)


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
	print("Godot AI input smoke passed: mouse look and committed Unicode")
	quit()
