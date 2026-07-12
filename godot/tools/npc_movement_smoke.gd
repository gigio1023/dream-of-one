extends SceneTree

## Focused regression for local NPC locomotion policy.
##
## This intentionally does not start the run sidecar. Runtime commands remain
## authoritative; the smoke proves only presentation movement, RVO/body yield,
## modal pause behavior, and bounded stuck recovery.

const TOWN_SCENE := "res://scenes/town/town_3d.tscn"
const EXPECTED_ACTOR_COUNT := 6
const AMBIENT_OBSERVE_FRAMES := 420
const COMMAND_TIMEOUT_FRAMES := 540
const STUCK_TIMEOUT_FRAMES := 720

var _failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	await process_frame
	var resource := load(TOWN_SCENE)
	if not resource is PackedScene:
		_failures.append("town scene did not load")
		_finish()
		return
	var town := (resource as PackedScene).instantiate()
	root.add_child(town)
	await process_frame
	if not await _wait_for_navigation(town):
		_failures.append("town navigation map never synchronized")
		town.queue_free()
		_finish()
		return

	var actors := _town_actors(town)
	if actors.size() != EXPECTED_ACTOR_COUNT:
		_failures.append("expected six NPCs, found %d" % actors.size())
		town.queue_free()
		_finish()
		return

	await _check_ambient_wander(actors)
	await _check_modal_pause_resume(town, actors["NPC_Roaming_Liaison"] as NPC3D)
	_stop_all(actors)
	await physics_frame
	await _check_npc_crossing(town, actors)
	await _check_player_yield(town, actors)
	await _check_contact_preemption(town, actors)
	await _check_bounded_stuck_recovery(town, actors)

	town.queue_free()
	await process_frame
	_finish()


func _check_ambient_wander(actors: Dictionary) -> void:
	var starts: Dictionary = {}
	var moved: Dictionary = {}
	for actor_id in actors:
		var actor := actors[actor_id] as NPC3D
		starts[actor_id] = actor.global_position
		moved[actor_id] = false
	for _frame in range(AMBIENT_OBSERVE_FRAMES):
		await physics_frame
		for actor_id in actors:
			var actor := actors[actor_id] as NPC3D
			var start := starts[actor_id] as Vector3
			if _planar_distance(actor.global_position, start) > 0.2:
				moved[actor_id] = true
	var moved_count := 0
	for actor_id in actors:
		var actor := actors[actor_id] as NPC3D
		var status := actor.movement_status()
		var ambient := status.get("ambient", {}) as Dictionary
		if bool(moved[actor_id]):
			moved_count += 1
		if int(ambient.get("cycleCount", 0)) < 1:
			_failures.append("%s selected no ambient destination" % actor_id)
		var start := starts[actor_id] as Vector3
		if _planar_distance(actor.global_position, start) > actor.ambient_wander_radius + 1.0:
			_failures.append("%s ambient wander escaped its local radius" % actor_id)
	if moved_count < 4:
		_failures.append("only %d/6 NPCs made readable ambient progress" % moved_count)


func _check_modal_pause_resume(town: Node, actor: NPC3D) -> void:
	actor.stop()
	var start_value: Variant = town.call("navigation_position", "Park.meeting_east_north")
	var target_value: Variant = town.call("navigation_position", "Park.meeting_east_south")
	if not start_value is Vector3 or not target_value is Vector3:
		_failures.append("modal pause anchors did not project")
		return
	actor.global_position = start_value as Vector3
	actor.apply_movement_command(
		"modal-pause-smoke",
		"smoke.modal_resume",
		target_value as Vector3
	)
	var began_moving := false
	for _frame in range(180):
		await physics_frame
		if str(actor.movement_status().get("mode", "")) == "command":
			began_moving = true
			break
	if not began_moving:
		_failures.append("ambient actor never entered walk before modal pause")
		return
	var paused_position := actor.global_position
	paused = true
	for _frame in range(30):
		await process_frame
	if actor.global_position.distance_to(paused_position) > 0.001:
		_failures.append("NPC moved while modal SceneTree pause was active")
	paused = false
	var resumed := false
	for _frame in range(180):
		await physics_frame
		if _planar_distance(actor.global_position, paused_position) > 0.12:
			resumed = true
			break
	if not resumed:
		_failures.append("NPC did not resume policy movement after modal pause")
	actor.stop()


func _check_npc_crossing(town: Node, actors: Dictionary) -> void:
	var caretaker := actors["NPC_Park_Caretaker"] as NPC3D
	var liaison := actors["NPC_Roaming_Liaison"] as NPC3D
	var west_value: Variant = town.call("navigation_position", "Park.meeting_west_north")
	var east_value: Variant = town.call("navigation_position", "Park.meeting_east_north")
	if not west_value is Vector3 or not east_value is Vector3:
		_failures.append("crossing anchors did not project")
		return
	var west := west_value as Vector3
	var east := east_value as Vector3
	caretaker.global_position = west
	liaison.global_position = east
	await physics_frame
	var arrivals: Dictionary = {}
	var on_arrival := func(
		movement_id: String,
		actor_id: StringName,
		_anchor_ref: String
	) -> void:
		arrivals[str(actor_id)] = movement_id
	caretaker.movement_arrived.connect(on_arrival)
	liaison.movement_arrived.connect(on_arrival)
	caretaker.apply_movement_command("npc-cross-caretaker", "smoke.east", east)
	liaison.apply_movement_command("npc-cross-liaison", "smoke.west", west)
	var minimum_separation := INF
	for _frame in range(COMMAND_TIMEOUT_FRAMES):
		await physics_frame
		minimum_separation = minf(
			minimum_separation,
			_planar_distance(caretaker.global_position, liaison.global_position)
		)
		if arrivals.size() == 2:
			break
	if caretaker.movement_arrived.is_connected(on_arrival):
		caretaker.movement_arrived.disconnect(on_arrival)
	if liaison.movement_arrived.is_connected(on_arrival):
		liaison.movement_arrived.disconnect(on_arrival)
	if arrivals.size() != 2:
		_failures.append("two NPCs did not yield and complete a crossing: %s" % arrivals)
	if minimum_separation < 0.65:
		_failures.append("NPC crossing violated capsule separation: %.3f" % minimum_separation)
	caretaker.stop()
	liaison.stop()


func _check_player_yield(town: Node, actors: Dictionary) -> void:
	var actor := actors["NPC_Park_Caretaker"] as NPC3D
	var player := town.get_node_or_null("Actors/Player3D") as Node3D
	var west_value: Variant = town.call("navigation_position", "Park.meeting_west_north")
	var east_value: Variant = town.call("navigation_position", "Park.meeting_west_south")
	if player == null or not west_value is Vector3 or not east_value is Vector3:
		_failures.append("player-yield anchors or player are missing")
		return
	var west := west_value as Vector3
	var east := east_value as Vector3
	actor.global_position = west
	player.global_position = west.lerp(east, 0.5)
	await physics_frame
	var player_start := player.global_position
	var arrival_state := {"arrived": false}
	var on_arrival := func(
		movement_id: String,
		_actor_id: StringName,
		_anchor_ref: String
	) -> void:
		if movement_id == "player-yield-smoke":
			arrival_state["arrived"] = true
	actor.movement_arrived.connect(on_arrival)
	actor.apply_movement_command("player-yield-smoke", "smoke.player_yield", east)
	var minimum_separation := INF
	for _frame in range(COMMAND_TIMEOUT_FRAMES):
		await physics_frame
		minimum_separation = minf(
			minimum_separation,
			_planar_distance(actor.global_position, player.global_position)
		)
		if bool(arrival_state["arrived"]):
			break
	if actor.movement_arrived.is_connected(on_arrival):
		actor.movement_arrived.disconnect(on_arrival)
	if not bool(arrival_state["arrived"]):
		_failures.append(
			"NPC did not route around a stationary player: %s"
			% actor.movement_status()
		)
	if _planar_distance(player.global_position, player_start) > 0.001:
		_failures.append("NPC pushed the stationary player")
	if minimum_separation < 0.65:
		_failures.append("NPC/player yield violated capsule separation: %.3f" % minimum_separation)
	actor.stop()


func _check_contact_preemption(town: Node, actors: Dictionary) -> void:
	var actor := actors["NPC_Studio_Receptionist"] as NPC3D
	var player := town.get_node_or_null("Actors/Player3D") as Node3D
	var origin_value: Variant = town.call("navigation_position", "Park.meeting_east_north")
	if player == null or not origin_value is Vector3:
		_failures.append("contact preemption player or origin is missing")
		return
	var origin := origin_value as Vector3
	actor.stop()
	actor.global_position = origin
	player.global_position = origin + Vector3(0.0, 0.0, 3.0)
	await physics_frame
	var forged_arrivals: Array[String] = []
	var on_arrival := func(
		movement_id: String,
		_actor_id: StringName,
		_anchor_ref: String
	) -> void:
		forged_arrivals.append(movement_id)
	actor.movement_arrived.connect(on_arrival)
	if not actor.begin_player_contact("npc-movement-contact", player, 1.6):
		_failures.append("NPC rejected a valid local contact")
		return
	var conflicting_applied := actor.apply_movement_command(
		"contact-conflict-smoke",
		"smoke.conflict",
		origin + Vector3(2.0, 0.0, 0.0)
	)
	if conflicting_applied or not actor.has_player_contact("npc-movement-contact"):
		_failures.append("runtime movement preempted an active player contact")
	var became_ready := false
	for _frame in range(300):
		await physics_frame
		if actor.player_contact_is_ready("npc-movement-contact"):
			became_ready = true
			break
	if not became_ready:
		_failures.append("contact approach never reached safe-distance readiness")
	actor.cancel_player_contact(origin)
	var returned := false
	for _frame in range(300):
		await physics_frame
		var status := actor.movement_status()
		if (
			not actor.has_player_contact()
			and str(status.get("mode", "")) in ["none", "ambient"]
			and _planar_distance(actor.global_position, origin) <= 0.9
		):
			returned = true
			break
	if not returned:
		_failures.append("contact cancellation did not return to local policy origin")
	if not forged_arrivals.is_empty():
		_failures.append("contact return forged runtime arrivals: %s" % forged_arrivals)
	if actor.movement_arrived.is_connected(on_arrival):
		actor.movement_arrived.disconnect(on_arrival)
	actor.stop()


func _check_bounded_stuck_recovery(town: Node, actors: Dictionary) -> void:
	var actor := actors["NPC_Station_Officer"] as NPC3D
	var parked_positions := {
		"NPC_Studio_Receptionist": Vector3(-2.0, 0.05, -14.2),
		"NPC_Studio_Manager": Vector3(0.0, 0.05, -18.0),
		"NPC_Office_Worker": Vector3(-17.0, 0.05, 0.0),
		"NPC_Park_Caretaker": Vector3(-3.0, 0.05, 3.0),
		"NPC_Roaming_Liaison": Vector3(3.0, 0.05, 3.0),
	}
	for actor_id in parked_positions:
		var parked_actor := actors[actor_id] as NPC3D
		parked_actor.stop()
		parked_actor.global_position = parked_positions[actor_id]
	var player := town.get_node_or_null("Actors/Player3D") as Node3D
	if player != null:
		player.global_position = Vector3(8.0, 0.05, 5.0)
	var start_value: Variant = town.call("navigation_position", "Park.meeting_west_north")
	var target_value: Variant = town.call("navigation_position", "Park.meeting_west_south")
	if not start_value is Vector3 or not target_value is Vector3:
		_failures.append("stuck-recovery anchors did not project")
		return
	var start := start_value as Vector3
	var target := target_value as Vector3
	actor.global_position = start
	var cage := _build_collision_cage(start)
	root.add_child(cage)
	await physics_frame
	var blocks: Array[Dictionary] = []
	var on_block := func(
		movement_id: String,
		_actor_id: StringName,
		_anchor_ref: String,
		reason: String
	) -> void:
		blocks.append({"movementId": movement_id, "reason": reason})
	actor.movement_blocked.connect(on_block)
	actor.apply_movement_command("stuck-smoke", "smoke.caged", target)
	for _frame in range(STUCK_TIMEOUT_FRAMES):
		await physics_frame
		if not blocks.is_empty():
			break
	if actor.movement_blocked.is_connected(on_block):
		actor.movement_blocked.disconnect(on_block)
	if blocks.size() != 1 or str(blocks[0].get("reason", "")) != "navigation_stuck":
		_failures.append("caged movement did not report one bounded navigation_stuck: %s" % blocks)
	if _planar_distance(actor.global_position, start) > 0.8:
		_failures.append("stuck recovery visibly teleported the NPC")
	var stuck_status := actor.movement_status()
	if int(stuck_status.get("stuckRecoveryCount", 0)) < 3:
		_failures.append("stuck detector did not exhaust local replan attempts")
	cage.queue_free()
	await physics_frame
	await physics_frame
	var recovery_state := {"recovered": false}
	var on_recovered := func(
		movement_id: String,
		_actor_id: StringName,
		_anchor_ref: String
	) -> void:
		if movement_id == "stuck-smoke-retry":
			recovery_state["recovered"] = true
	actor.movement_arrived.connect(on_recovered)
	actor.apply_movement_command("stuck-smoke-retry", "smoke.recovered", target)
	for _frame in range(COMMAND_TIMEOUT_FRAMES):
		await physics_frame
		if bool(recovery_state["recovered"]):
			break
	if actor.movement_arrived.is_connected(on_recovered):
		actor.movement_arrived.disconnect(on_recovered)
	if not bool(recovery_state["recovered"]):
		_failures.append(
			"NPC did not recover after the body blocker was removed: %s"
			% actor.movement_status()
		)
	actor.stop()


func _build_collision_cage(center: Vector3) -> Node3D:
	var cage := Node3D.new()
	cage.name = "NPCMovementSmokeCage"
	_add_wall(cage, center + Vector3(0.62, 0.9, 0.0), Vector3(0.16, 1.8, 2.4))
	_add_wall(cage, center + Vector3(-0.62, 0.9, 0.0), Vector3(0.16, 1.8, 2.4))
	_add_wall(cage, center + Vector3(0.0, 0.9, 0.62), Vector3(2.4, 1.8, 0.16))
	_add_wall(cage, center + Vector3(0.0, 0.9, -0.62), Vector3(2.4, 1.8, 0.16))
	return cage


func _add_wall(parent: Node3D, position: Vector3, size: Vector3) -> void:
	var body := StaticBody3D.new()
	body.position = position
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	parent.add_child(body)


func _wait_for_navigation(town: Node) -> bool:
	var actor := town.get_node_or_null("Actors/NPC_Park_Caretaker") as NPC3D
	if actor == null:
		return false
	var agent := actor.get_node_or_null("NavigationAgent3D") as NavigationAgent3D
	if agent == null:
		return false
	for _frame in range(180):
		await physics_frame
		var navigation_map := agent.get_navigation_map()
		if (
			navigation_map.is_valid()
			and NavigationServer3D.map_get_iteration_id(navigation_map) > 0
		):
			return true
	return false


func _town_actors(town: Node) -> Dictionary:
	var actors: Dictionary = {}
	var actors_root := town.get_node_or_null("Actors")
	if actors_root == null:
		return actors
	for child in actors_root.get_children():
		if child is NPC3D:
			actors[str((child as NPC3D).actor_id)] = child
	return actors


func _stop_all(actors: Dictionary) -> void:
	for actor_value in actors.values():
		(actor_value as NPC3D).stop()


func _planar_distance(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()


func _finish() -> void:
	if _failures.is_empty():
		print(
			"PASS npc_movement_smoke: six ambient walkers, modal pause/resume, "
			+ "NPC/player avoidance, and bounded stuck recovery"
		)
		quit(0)
		return
	for failure in _failures:
		print("FAIL npc_movement_smoke: %s" % failure)
	quit(1)
