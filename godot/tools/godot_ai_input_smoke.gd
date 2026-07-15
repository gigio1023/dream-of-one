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
	var active_contact := false

	func get_interaction_label_key() -> StringName:
		return &"test.focus_npc"

	func is_interaction_enabled() -> bool:
		return interaction_enabled

	func get_interaction_aim_position() -> Vector3:
		return global_position + Vector3.UP * 1.35

	func has_player_contact(_contact_id := "") -> bool:
		return active_contact

	func interact(_player: Node) -> void:
		interaction_count += 1


class FocusRecord:
	extends StaticBody3D
	var interaction_count := 0

	func get_interaction_label_key() -> StringName:
		return &"test.focus_record"

	func is_interaction_enabled() -> bool:
		return true

	func interaction_kind() -> StringName:
		return &"record_surface"

	func interact(_player: Node) -> void:
		interaction_count += 1

var _failures: Array[String] = []
var _last_preload_intent_target: Node = null
var _unfocused_interaction_count := 0


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
	player.unfocused_interaction_requested.connect(_on_unfocused_interaction_requested)
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

	var return_look := Vector2(0.25, -0.12)
	player.call("set_look_orientation", return_look)
	player.call("release_mouse")
	player.call("capture_mouse")
	var capture_warp := InputEventMouseMotion.new()
	capture_warp.position = Vector2(512.0, 384.0)
	capture_warp.relative = Vector2(-204.0, 17.0)
	capture_warp.screen_relative = capture_warp.relative
	player.call("_apply_captured_mouse_motion", capture_warp)
	if (player.call("look_orientation") as Vector2).distance_to(return_look) > 0.001:
		_failures.append("capturing the mouse applied its cursor warp as player look")
	var resumed_mouse_motion := InputEventMouseMotion.new()
	resumed_mouse_motion.position = Vector2(522.0, 384.0)
	resumed_mouse_motion.relative = Vector2(10.0, 0.0)
	resumed_mouse_motion.screen_relative = resumed_mouse_motion.relative
	player.call("_apply_captured_mouse_motion", resumed_mouse_motion)
	if (player.call("look_orientation") as Vector2).distance_to(return_look) < 0.001:
		_failures.append("mouse capture suppression swallowed resumed player look")

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
	var camera := player.get_node("Head/Camera3D") as Camera3D
	var initial_look: Vector2 = player.call("look_orientation")
	player.call("set_look_orientation", Vector2(0.37, 0.41))
	var below_target := camera.global_position + Vector3(0.9, -0.8, -2.4)
	player.call("face_position", below_target)
	var camera_forward := -camera.global_transform.basis.z.normalized()
	if (
		camera_forward.dot((below_target - camera.global_position).normalized()) < 0.999
		or float((player.call("look_orientation") as Vector2).y) >= 0.0
	):
		_failures.append(
			"Player3D face_position did not frame a lower target from an existing pitch"
		)
	player.call("set_look_orientation", Vector2(-0.28, -0.36))
	var above_target := camera.global_position + Vector3(-0.7, 0.9, -2.6)
	player.call("face_position", above_target)
	camera_forward = -camera.global_transform.basis.z.normalized()
	if (
		camera_forward.dot((above_target - camera.global_position).normalized()) < 0.999
		or float((player.call("look_orientation") as Vector2).y) <= 0.0
	):
		_failures.append(
			"Player3D face_position did not frame a higher target from an existing pitch"
		)
	player.call("set_look_orientation", initial_look)
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
	await physics_frame

	# A nearby NPC just outside the exact capsule ray is still an explicit look:
	# it may recover a provider opening, while only a ready NPC becomes E focus.
	npc_capsule.radius = 0.1
	focus_npc.position = Vector3(0.3, 0.0, -2.0)
	focus_npc.interaction_enabled = true
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != focus_npc:
		_failures.append("NPC aim assist did not recover nearby provider-preload intent")
	if player.call("focused_interactable") != focus_npc:
		_failures.append("ready NPC inside the narrow aim assist was not acquired")
	if not bool(player.call("interact_focused")) or focus_npc.interaction_count != 2:
		_failures.append("ready NPC aim assist did not reach the normal interaction path")

	# A ready resident in front of an inspectable board wins the social focus,
	# even near the outer observed route angle, while the exact ray remains
	# demonstrably aimed at the board.
	focus_npc.position = Vector3(1.15, 0.0, -2.0)
	var focus_record := FocusRecord.new()
	focus_record.position = Vector3(0.0, 0.0, -1.7)
	var record_shape := CollisionShape3D.new()
	var record_box := BoxShape3D.new()
	# The wide board blocks the NPC torso ray unless record surfaces are treated
	# as thin interaction overlays for ready-resident acquisition.
	record_box.size = Vector3(2.5, 2.0, 0.1)
	record_shape.position = Vector3.UP
	record_shape.shape = record_box
	focus_record.add_child(record_shape)
	root.add_child(focus_record)
	await physics_frame
	await physics_frame
	if player.call("_interactable_collider") != focus_record:
		_failures.append("record-priority proof did not hold the exact interaction ray")
	if player.call("focused_interactable") != focus_npc:
		_failures.append("ready NPC did not outrank a nearby exact record surface")
	focus_record.queue_free()
	await physics_frame
	player.global_position = Vector3.ZERO
	player.velocity = Vector3.ZERO
	focus_npc.position = Vector3(0.12, 0.0, -0.75)
	player.call("_set_focused_target", null)
	player.call("_clear_recent_npc_focus")
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != focus_npc:
		_failures.append("near NPC aim assist did not preserve provider-preload intent")
	if player.call("focused_interactable") != focus_npc:
		_failures.append("NPC aim assist rejected a visible torso at close conversation range")

	# Contact intent wins only among otherwise valid assist candidates.
	focus_npc.position = Vector3(0.3, 0.0, -2.0)
	focus_npc.active_contact = true
	var closer_npc := FocusNpc.new()
	closer_npc.position = Vector3(-0.15, 0.0, -2.0)
	closer_npc.add_to_group(&"npc_actors")
	var closer_shape := CollisionShape3D.new()
	var closer_capsule := CapsuleShape3D.new()
	closer_capsule.radius = 0.08
	closer_capsule.height = 1.8
	closer_shape.position = Vector3.UP * 0.9
	closer_shape.shape = closer_capsule
	closer_npc.add_child(closer_shape)
	root.add_child(closer_npc)
	await physics_frame
	await physics_frame
	if player.call("focused_interactable") != focus_npc:
		_failures.append("ready contact NPC did not outrank a closer ordinary aim-assist NPC")
	closer_npc.queue_free()
	focus_npc.active_contact = false
	player.call("_set_focused_target", null)
	player.call("_clear_recent_npc_focus")
	await physics_frame

	focus_npc.interaction_enabled = false
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != focus_npc:
		_failures.append("unready nearby NPC did not receive assisted preload intent")
	if player.call("focused_interactable") != null or bool(player.call("interact_focused")):
		_failures.append("unready NPC leaked into aim-assist interaction")

	focus_npc.interaction_enabled = true
	focus_npc.visible = false
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != null:
		_failures.append("invisible NPC leaked into assisted preload intent")
	if player.call("focused_interactable") != null or bool(player.call("interact_focused")):
		_failures.append("invisible NPC leaked into aim-assist interaction")
	focus_npc.visible = true
	var assist_occluder := StaticBody3D.new()
	assist_occluder.position = Vector3(0.15, 1.0, -1.0)
	var assist_occluder_shape := CollisionShape3D.new()
	var assist_occluder_box := BoxShape3D.new()
	assist_occluder_box.size = Vector3(0.8, 2.0, 0.2)
	assist_occluder_shape.shape = assist_occluder_box
	assist_occluder.add_child(assist_occluder_shape)
	root.add_child(assist_occluder)
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != null:
		_failures.append("assisted preload intent passed through an occluding wall")
	if player.call("focused_interactable") != null or bool(player.call("interact_focused")):
		_failures.append("NPC aim assist passed through an occluding wall")
	assist_occluder.queue_free()
	await physics_frame
	var head := player.get_node("Head") as Node3D
	for pitch in [deg_to_rad(55.0), deg_to_rad(-55.0)]:
		head.rotation.x = pitch
		player.call("_set_focused_target", null)
		player.call("_clear_recent_npc_focus")
		await physics_frame
		await physics_frame
		if player.call("focused_interactable") != null or bool(player.call("interact_focused")):
			_failures.append("NPC aim assist ignored camera-relative vertical aim")
	head.rotation.x = 0.0
	player.call("_set_focused_target", null)
	player.call("_clear_recent_npc_focus")
	await physics_frame

	focus_npc.position = Vector3(0.0, 0.0, 2.0)
	await physics_frame
	await physics_frame
	if player.call("focused_interactable") != null or bool(player.call("interact_focused")):
		_failures.append("NPC aim assist allowed a target behind the camera")

	# A global owner such as Main may route an otherwise unfocused E press to its
	# authoritative active contact without teaching Player3D about run state.
	focus_npc.active_contact = true
	var contact_interaction_count := focus_npc.interaction_count
	var unfocused_count_before := _unfocused_interaction_count
	var contact_press: Dictionary = helper.call("_game_input_key", {
		"key": "E",
		"pressed": true,
		"echo": false,
	})
	await process_frame
	var contact_release: Dictionary = helper.call("_game_input_key", {
		"key": "E",
		"pressed": false,
		"echo": false,
	})
	await process_frame
	if not bool(contact_press.get("sent", false)) or not bool(contact_release.get("sent", false)):
		_failures.append("Godot AI E event was rejected without a focused target")
	elif _unfocused_interaction_count != unfocused_count_before + 1:
		_failures.append("unfocused E did not reach the owning scene through the normal input path")
	elif focus_npc.interaction_count != contact_interaction_count:
		_failures.append("Player3D directly routed an unfocused E to a guessed contact target")
	focus_npc.active_contact = false

	# The runtime accepts an ordinary conversation only at a 2.85 m actor-root
	# center distance. The wider 5 m look still prepares an opening, but neither
	# aim assist nor the recent-focus grace may advertise an E press outside the
	# authoritative start boundary.
	var inside_conversation_z := -sqrt(2.84 * 2.84 - 0.3 * 0.3)
	var outside_conversation_z := -sqrt(2.90 * 2.90 - 0.3 * 0.3)
	player.global_position = Vector3.ZERO
	player.velocity = Vector3.ZERO
	focus_npc.position = Vector3(0.3, 0.0, inside_conversation_z)
	player.call("_set_focused_target", null)
	player.call("_clear_recent_npc_focus")
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != focus_npc:
		_failures.append("NPC conversation boundary lost the wider preload intent")
	if player.call("focused_interactable") != focus_npc:
		_failures.append("ready NPC inside the 2.85 meter runtime boundary was not acquired")
	var boundary_interaction_count := focus_npc.interaction_count
	player.call("_set_focused_target", null)
	focus_npc.position = Vector3(0.3, 0.0, outside_conversation_z)
	if bool(player.call("interact_focused")):
		_failures.append("NPC focus grace leaked E beyond the 2.85 meter runtime boundary")
	elif focus_npc.interaction_count != boundary_interaction_count:
		_failures.append("out-of-range NPC focus grace reached the interaction callback")
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != focus_npc:
		_failures.append("out-of-range ready NPC lost its valid preload intent")
	if player.call("focused_interactable") != null or bool(player.call("interact_focused")):
		_failures.append("ready NPC outside the 2.85 meter runtime boundary exposed E")
	focus_npc.position = Vector3(0.3, 0.0, inside_conversation_z)
	await physics_frame
	await physics_frame
	if not bool(player.call("interact_focused")):
		_failures.append("ready NPC inside the 2.85 meter runtime boundary rejected E")
	elif focus_npc.interaction_count != boundary_interaction_count + 1:
		_failures.append("in-range NPC boundary interaction did not reach its callback once")

	focus_npc.position = Vector3(0.0, 0.0, -3.2)
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != focus_npc:
		_failures.append("NPC approach intent did not extend beyond the E acquisition bound")
	if player.call("focused_interactable") != null or bool(player.call("interact_focused")):
		_failures.append("NPC aim assist exceeded its 2.85 meter runtime boundary")
	focus_npc.position = Vector3(0.0, 0.0, -5.2)
	await physics_frame
	await physics_frame
	if player.call("preload_intent_target") != null:
		_failures.append("NPC assisted preload intent exceeded its 5 meter approach bound")
	focus_npc.queue_free()

	await _finish(probe, player)


func _on_preload_intent_changed(target: Node) -> void:
	_last_preload_intent_target = target


func _on_unfocused_interaction_requested() -> void:
	_unfocused_interaction_count += 1


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
	print("Godot AI input smoke passed: mouse look, capture-warp suppression, Unicode, camera framing, assisted preload aim, gated E, unfocused owner handoff, safe focus grace, and bounded ready-NPC aim assist")
	quit()
