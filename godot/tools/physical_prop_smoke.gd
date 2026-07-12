extends SceneTree

## Focused, provider-free proof of the T8 carry/place/throw physics contract.

const PLAYER_SCENE := preload("res://scenes/actors/player_3d.tscn")
const PROP_SCENE := preload("res://scenes/props/physical_props_3d.tscn")
const AUDIO_SCENE := preload("res://scenes/audio/audio_feedback.tscn")
const EXPECTED_PROP_IDS := [
	"Prop_Park_Box",
	"Prop_Studio_Keyboard",
	"Prop_Studio_Plant",
]
const ACTOR_IDS := [
	"NPC_Office_Worker",
	"NPC_Park_Caretaker",
	"NPC_Roaming_Liaison",
	"NPC_Station_Officer",
	"NPC_Studio_Manager",
	"NPC_Studio_Receptionist",
]

class ObserverBody:
	extends CharacterBody3D
	var actor_id: StringName

var _failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	await process_frame
	var world := Node3D.new()
	world.name = "PhysicalPropSmokeWorld"
	root.add_child(world)
	var floor_body := _box_body("Floor", Vector3(50, 0.2, 50), Vector3(0, -0.1, 0))
	world.add_child(floor_body)
	var wall := _box_body("NearWall", Vector3(4, 3, 0.2), Vector3(-2.4, 1.5, -14.2))
	world.add_child(wall)

	var player := PLAYER_SCENE.instantiate() as CharacterBody3D
	player.position = Vector3(-2.4, 0.0, -13.4)
	world.add_child(player)
	for index in ACTOR_IDS.size():
		var observer := ObserverBody.new()
		observer.actor_id = StringName(ACTOR_IDS[index])
		observer.position = Vector3(-5.0 + index * 1.2, 0.0, -11.8)
		observer.add_to_group(&"npc_actors")
		world.add_child(observer)

	var props := PROP_SCENE.instantiate() as Node3D
	world.add_child(props)
	var audio := AUDIO_SCENE.instantiate() as AudioFeedback
	world.add_child(audio)
	await process_frame
	await physics_frame

	var prop_ids: Array[String] = []
	for prop_value in get_nodes_in_group(&"physical_props"):
		if prop_value is CarryableProp3D:
			var prop := prop_value as CarryableProp3D
			prop_ids.append(prop.prop_id)
			if prop.collision_layer != 24 or prop.collision_mask != 7:
				_failures.append("%s collision contract drifted" % prop.prop_id)
			for group_name in [&"carryable_props", &"spatial_props", &"interactables"]:
				if not prop.is_in_group(group_name):
					_failures.append("%s is missing %s" % [prop.prop_id, group_name])
	prop_ids.sort()
	if prop_ids != EXPECTED_PROP_IDS:
		_failures.append("physical prop ids drifted: %s" % prop_ids)

	var keyboard := props.get_node_or_null("Prop_Studio_Keyboard") as CarryableProp3D
	if keyboard == null:
		_failures.append("keyboard prop is missing")
		_finish(world)
		return
	keyboard.impact.emit(keyboard.prop_id, 3.0)
	await process_frame
	if int(audio.presentation_snapshot().get("propImpacts", -1)) != 0:
		_failures.append("startup prop contact produced impact audio")
	await create_timer(0.8).timeout
	if not bool(audio.presentation_snapshot().get("propImpactsArmed", false)):
		_failures.append("prop impact audio did not arm after startup settle")
	keyboard.impact.emit(keyboard.prop_id, 3.0)
	await process_frame
	if int(audio.presentation_snapshot().get("propImpacts", -1)) != 1:
		_failures.append("post-startup prop impact audio did not play exactly once")
	var events: Array[Dictionary] = []
	keyboard.handling_event.connect(func(event: Dictionary) -> void:
		events.append(event.duplicate(true))
	)
	if not bool(player.call("try_pick_up_prop", keyboard)):
		_failures.append("player could not pick up the keyboard")
	else:
		await physics_frame
		if not keyboard.is_carried() or not keyboard.freeze:
			_failures.append("picked-up keyboard is not frozen carry state")
		if keyboard.collision_layer != 0 or keyboard.collision_mask != 0:
			_failures.append("carried keyboard can collide with the player")
		if keyboard.global_position.z <= -14.08:
			_failures.append("near-wall hold target crossed the wall face")
		if not bool(player.call("place_held_prop")):
			_failures.append("player could not place the keyboard")
		if keyboard.freeze or keyboard.collision_layer != 24 or keyboard.collision_mask != 7:
			_failures.append("placed keyboard did not restore rigid collision")

	wall.queue_free()
	await process_frame
	if not bool(player.call("try_pick_up_prop", keyboard)):
		_failures.append("player could not pick the keyboard up a second time")
	elif not bool(player.call("throw_held_prop")):
		_failures.append("player could not throw the keyboard")
	else:
		await physics_frame
		if not keyboard.linear_velocity.is_finite():
			_failures.append("throw produced non-finite velocity")
		if keyboard.linear_velocity.length() > keyboard.max_release_speed_mps + 0.05:
			_failures.append("throw exceeded the prop velocity ceiling")
		if Vector2(player.velocity.x, player.velocity.z).length() > 0.1:
			_failures.append("throw imparted an explosive force to the player")

	keyboard.global_position.y = -20.0
	keyboard.linear_velocity = Vector3.ZERO
	await physics_frame
	await physics_frame
	if keyboard.global_position.y < 0.0:
		_failures.append("out-of-bounds keyboard did not return to its spawn")

	var actions: Array[String] = []
	for event in events:
		actions.append(str(event.get("action", "")))
		var observers := event.get("observers", []) as Array
		var observer_ids: Array[String] = []
		for observer_value in observers:
			if observer_value is Dictionary:
				observer_ids.append(str((observer_value as Dictionary).get("actorId", "")))
		observer_ids.sort()
		if observer_ids != ACTOR_IDS:
			_failures.append("prop event did not carry exact-six observer facts")
	if not actions.has("pick_up") or not actions.has("place") or not actions.has("throw"):
		_failures.append("handling signals are incomplete: %s" % [actions])

	_finish(world)


func _box_body(body_name: String, size: Vector3, position: Vector3) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = body_name
	body.position = position
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	return body


func _finish(world: Node) -> void:
	var audio := world.get_node_or_null("AudioFeedback")
	if audio != null:
		for child_value in audio.get_children():
			if child_value is AudioStreamPlayer:
				(child_value as AudioStreamPlayer).stop()
				(child_value as AudioStreamPlayer).stream = null
			elif child_value is AudioStreamPlayer3D:
				(child_value as AudioStreamPlayer3D).stop()
				(child_value as AudioStreamPlayer3D).stream = null
		# AudioServer releases active WAV playbacks asynchronously after stop.
		await create_timer(0.2).timeout
		audio.queue_free()
		await process_frame
	world.queue_free()
	await process_frame
	await process_frame
	if _failures.is_empty():
		print("PASS physical_prop_smoke: carry/place/throw, impact arming, groups, bounds, exact-six facts")
		quit(0)
		return
	for failure in _failures:
		print("FAIL physical_prop_smoke: %s" % failure)
	quit(1)
