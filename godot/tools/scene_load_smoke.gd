extends SceneTree

## Instances the retained M1 harness and active M3R client scenes in-tree.
## This is deliberately a scene/runtime smoke, not a structural unit test.

const SCENES := [
	{"label": "store", "path": "res://scenes/world/store.tscn", "frames": 1},
	{"label": "station", "path": "res://scenes/world/station.tscn", "frames": 1},
	{"label": "player", "path": "res://scenes/actors/player.tscn", "frames": 1},
	{"label": "npc", "path": "res://scenes/actors/npc_2d.tscn", "frames": 1},
	{"label": "prop", "path": "res://scenes/props/record_prop_2d.tscn", "frames": 1},
	{"label": "hud", "path": "res://scenes/ui/hud.tscn", "frames": 1},
	{"label": "main", "path": "res://scenes/main.tscn", "frames": 4},
	{"label": "player_3d", "path": "res://scenes/actors/player_3d.tscn", "frames": 2},
	{"label": "npc_3d", "path": "res://scenes/actors/npc_3d.tscn", "frames": 2},
	{"label": "hud_3d", "path": "res://scenes/ui/hud_3d.tscn", "frames": 2},
	{"label": "town_3d", "path": "res://scenes/town/town_3d.tscn", "frames": 6},
	{"label": "main_3d", "path": "res://scenes/main_3d.tscn", "frames": 6},
	{"label": "main_3d_contact", "path": "res://scenes/main_3d.tscn", "frames": 6},
	{"label": "main_3d_hearing", "path": "res://scenes/main_3d.tscn", "frames": 6},
	{
		"label": "main_3d_schedule",
		"path": "res://scenes/main_3d.tscn",
		"frames": 6,
	},
	{
		"label": "main_3d_ambient_inside",
		"path": "res://scenes/main_3d.tscn",
		"frames": 6,
	},
	{
		"label": "main_3d_ambient_outside",
		"path": "res://scenes/main_3d.tscn",
		"frames": 6,
	},
	{
		"label": "main_3d_ambient_leave",
		"path": "res://scenes/main_3d.tscn",
		"frames": 6,
	},
]

var _failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	await process_frame
	_check_engine_baseline()
	for spec in SCENES:
		await _instance_scene(spec)

	if _failures.is_empty():
		print("PASS scene_load_smoke: instanced %d scenes in-tree" % SCENES.size())
		quit(0)
		return
	for failure in _failures:
		print("FAIL scene_load_smoke: %s" % failure)
	quit(1)

func _check_engine_baseline() -> void:
	var renderer := str(ProjectSettings.get_setting("rendering/renderer/rendering_method", ""))
	var physics_engine := str(ProjectSettings.get_setting("physics/3d/physics_engine", ""))
	if renderer != "forward_plus":
		_failures.append("renderer is %s instead of forward_plus" % renderer)
	if physics_engine != "Jolt Physics":
		_failures.append("3D physics is %s instead of Jolt Physics" % physics_engine)
	_check_jump_input_contract()
	if renderer == "forward_plus" and physics_engine == "Jolt Physics":
		print("PASS scene_load_smoke: Forward+ renderer and Jolt Physics baseline")


func _check_jump_input_contract() -> void:
	if not InputMap.has_action(&"jump"):
		_failures.append("3D player jump action is missing")
		return
	if not _action_has_physical_key(&"jump", KEY_SPACE):
		_failures.append("3D player jump action is not bound to physical Space")
	if _action_has_physical_key(&"interact", KEY_SPACE):
		_failures.append("physical Space still triggers interact as well as jump")
	if not InputMap.has_action(&"open_log") or not _action_has_physical_key(&"open_log", KEY_TAB):
		_failures.append("M3R inspect log is not bound to physical Tab")


func _action_has_physical_key(action: StringName, keycode: int) -> bool:
	for event in InputMap.action_get_events(action):
		if event is InputEventKey and int((event as InputEventKey).physical_keycode) == keycode:
			return true
	return false

func _instance_scene(spec: Dictionary) -> void:
	var label := str(spec.get("label", "unknown"))
	var path := str(spec.get("path", ""))
	var resource := ResourceLoader.load(path)
	if not resource is PackedScene:
		_failures.append("%s did not load as PackedScene: %s" % [label, path])
		return

	var instance := (resource as PackedScene).instantiate()
	if instance == null:
		_failures.append("%s could not instantiate: %s" % [label, path])
		return
	root.add_child(instance)
	for _frame in range(maxi(1, int(spec.get("frames", 1)))):
		await process_frame
	if label in [
		"town_3d",
		"main_3d",
		"main_3d_contact",
		"main_3d_hearing",
		"main_3d_schedule",
		"main_3d_ambient_inside",
		"main_3d_ambient_outside",
		"main_3d_ambient_leave",
	]:
		var town := instance if label == "town_3d" else instance.get_node_or_null("Town")
		if town != null:
			await _wait_for_town_navigation(label, town)

	if not is_instance_valid(instance) or not instance.is_inside_tree():
		_failures.append("%s did not survive one process frame" % label)
	else:
		await _check_runtime_shape(label, instance)
		if label == "town_3d":
			await _check_npc_movement(label, instance)
		if label == "main_3d":
			await _check_run_conversation(label, instance)
			_check_monotonic_grace_clock_rebase_contract(label, instance)
			_check_provider_evidence_freshness_contract(label, instance)
		if label == "main_3d_contact":
			await _check_player_contact(label, instance)
		if label == "main_3d_hearing":
			await _check_hearing_and_outcome(label, instance)
		if label == "main_3d_schedule":
			await _check_run_clock_and_schedule(label, instance)
		if label == "main_3d_ambient_inside":
			await _check_ambient_speech(label, instance, true)
		if label == "main_3d_ambient_outside":
			await _check_ambient_speech(label, instance, false)
		if label == "main_3d_ambient_leave":
			await _check_ambient_speech(label, instance, true, true)
		if not _has_failure_for(label):
			print("PASS scene_load_smoke: %s" % label)

	if is_instance_valid(instance):
		var stopped_audio := _stop_scene_audio_players(instance)
		if stopped_audio:
			await create_timer(0.2).timeout
		_clear_scene_audio_streams(instance)
		await process_frame
		instance.queue_free()
		await process_frame


func _stop_scene_audio_players(node: Node) -> bool:
	var stopped := false
	if node is AudioStreamPlayer:
		var player_2d := node as AudioStreamPlayer
		if player_2d.playing:
			player_2d.stop()
			stopped = true
	elif node is AudioStreamPlayer3D:
		var player_3d := node as AudioStreamPlayer3D
		if player_3d.playing:
			player_3d.stop()
			stopped = true
	for child in node.get_children():
		if child is Node:
			stopped = _stop_scene_audio_players(child as Node) or stopped
	return stopped


func _clear_scene_audio_streams(node: Node) -> void:
	if node is AudioStreamPlayer:
		(node as AudioStreamPlayer).stream = null
	elif node is AudioStreamPlayer3D:
		(node as AudioStreamPlayer3D).stream = null
	for child in node.get_children():
		if child is Node:
			_clear_scene_audio_streams(child as Node)


func _wait_for_town_navigation(label: String, town: Node) -> void:
	var region := town.get_node_or_null(
		"Navigation/TownNavigation"
	) as NavigationRegion3D
	if region == null:
		return
	var layout: Dictionary = town.call("layout_snapshot")
	var player_start: Dictionary = layout.get("player_start", {})
	var start := _vector3_from_json(player_start.get("position", []))
	var target := _anchor_position(layout, "Park.meeting_north")
	for _frame in range(120):
		var navigation_map := region.get_navigation_map()
		if navigation_map.is_valid() and NavigationServer3D.map_get_iteration_id(
			navigation_map
		) > 0:
			var projected_start := NavigationServer3D.map_get_closest_point(
				navigation_map,
				start
			)
			var projected_target := NavigationServer3D.map_get_closest_point(
				navigation_map,
				target
			)
			var path := NavigationServer3D.map_get_path(
				navigation_map,
				projected_start,
				projected_target,
				true
			)
			if (
				projected_start.distance_to(start) <= 0.65
				and projected_target.distance_to(target) <= 0.65
				and path.size() >= 2
				and path[path.size() - 1].distance_to(projected_target) <= 0.65
			):
				return
		await physics_frame
	_failures.append("%s navigation map did not become query-ready in 120 physics frames" % label)

func _check_runtime_shape(label: String, instance: Node) -> void:
	match label:
		"main":
			_require_node(label, instance, "WorldFrame/WorldContainer/WorldViewport")
			_require_node(label, instance, "WorldFrame/WorldContainer/WorldViewport/World")
			_require_node(label, instance, "HUD")
			# World scale contract (main.gd WORLD_VIEW_LADDER): the viewport is
			# one of the ladder views and the container applies an integer scale.
			var viewport := instance.get_node_or_null("WorldFrame/WorldContainer/WorldViewport") as SubViewport
			var container := instance.get_node_or_null("WorldFrame/WorldContainer") as SubViewportContainer
			if viewport != null:
				var ladder_views: Array[Vector2i] = []
				for step in instance.WORLD_VIEW_LADDER:
					ladder_views.append(step.get("view", Vector2i.ZERO))
				if not ladder_views.has(viewport.size):
					_failures.append("main world viewport %s is not a ladder view %s" % [viewport.size, ladder_views])
			if container != null:
				var scale_x := container.scale.x
				if scale_x < 1.0 or absf(scale_x - roundf(scale_x)) > 0.0001 or container.scale.y != scale_x:
					_failures.append("main world container scale is not a positive integer: %s" % container.scale)
			var world := instance.get_node_or_null("WorldFrame/WorldContainer/WorldViewport/World")
			if world != null and world.get_child_count() == 0:
				_failures.append("main World stayed empty after startup frames")
		"store", "station":
			if not instance.has_method("get_player") or instance.call("get_player") == null:
				_failures.append("%s did not build its player" % label)
			_require_node(label, instance, "Ground")
			_require_node(label, instance, "Walls")
			_require_node(label, instance, "Actors")
		"player":
			var sprite := instance.get_node_or_null("Sprite") as AnimatedSprite2D
			if sprite == null or sprite.sprite_frames == null:
				_failures.append("player has no runtime SpriteFrames")
		"npc":
			var sprite := instance.get_node_or_null("Sprite") as AnimatedSprite2D
			if sprite == null or sprite.sprite_frames == null:
				_failures.append("npc has no runtime SpriteFrames")
			if instance.get_node_or_null("SpeechBubble") != null or instance.get_node_or_null("ReactionMarker") != null:
				_failures.append("npc still renders normal-play text inside the pixel SubViewport")
			var debug_label := instance.get_node_or_null("DebugLabel") as Label
			if debug_label == null or debug_label.visible:
				_failures.append("npc raw debug label is missing or visible in normal play")
			var full_utterance := "가나다라마바사아자차카타파하".repeat(3)
			instance.call("show_speech", full_utterance)
			instance.call("set_reaction", "reported", "보고함")
			var overlay: Dictionary = instance.call("overlay_payload")
			if str(overlay.get("action", "")).is_empty():
				_failures.append("npc exposes no normal-view current action")
			var expected_summary := full_utterance.left(instance.BUBBLE_MAX_CHARS) + "…"
			if str(overlay.get("speech", "")) != expected_summary:
				_failures.append("npc native speech payload does not preserve 36-char gist + ellipsis")
			if not bool(overlay.get("reactionVisible", false)) or str(overlay.get("reaction", "")) != "보고함":
				_failures.append("npc native reaction payload is missing")
			var inspect: Dictionary = instance.call("inspect_payload")
			if str(inspect.get("utterance", "")) != full_utterance:
				_failures.append("npc inspect payload lost the full utterance")
			var bubble_timer := instance.get("_bubble_timer") as Timer
			if bubble_timer == null or not is_equal_approx(bubble_timer.wait_time, instance.BUBBLE_SECONDS):
				_failures.append("npc speech timer no longer preserves the 7-second contract")
		"prop":
			var sprite := instance.get_node_or_null("Sprite") as Sprite2D
			if sprite == null or sprite.texture == null:
				_failures.append("prop has no runtime texture")
			if instance.get_node_or_null("StateLabel") != null:
				_failures.append("prop still renders its state inside the pixel SubViewport")
			instance.call("configure", {"propId": "smoke_prop", "label": "정정표", "state": "offered"})
			instance.call("set_focused", true)
			var overlay: Dictionary = instance.call("overlay_payload")
			if not bool(overlay.get("stateVisible", false)) or str(overlay.get("state", "")).is_empty():
				_failures.append("focused prop exposes no native state payload")
		"hud":
			_require_node(label, instance, "Root/ConversationPanel")
			_require_node(label, instance, "Root/InspectPanel")
			_require_node(label, instance, "Root/OutcomePanel")
			_require_node(label, instance, "Root/WorldTextOverlays")
		"player_3d":
			_require_node(label, instance, "CollisionShape3D")
			_require_node(label, instance, "Head/Camera3D/InteractionRay")
			_require_node(label, instance, "NavigationObstacle3D")
			var camera := instance.get_node_or_null("Head/Camera3D") as Camera3D
			if camera == null or not camera.current or not is_equal_approx(camera.fov, 75.0):
				_failures.append("player_3d camera baseline drifted")
			var player_body := instance as CharacterBody3D
			var tuned_jump_velocity := float(instance.get("jump_velocity"))
			if tuned_jump_velocity < 4.0 or tuned_jump_velocity > 5.0:
				_failures.append(
					"player_3d jump velocity is outside its grounded baseline: %s"
					% tuned_jump_velocity
				)
			if not instance.has_method("can_jump"):
				_failures.append("player_3d exposes no grounded jump eligibility")
			elif bool(instance.call("can_jump")) != (
				bool(instance.get("_control_enabled")) and player_body.is_on_floor()
			):
				_failures.append("player_3d jump eligibility ignores control or floor state")
			else:
				instance.call("set_control_enabled", false)
				if bool(instance.call("can_jump")):
					_failures.append("player_3d can jump while player control is locked")
				instance.call("set_control_enabled", true)
		"npc_3d":
			_require_node(label, instance, "CollisionShape3D")
			_require_node(label, instance, "RoleAccent")
			_require_node(label, instance, "NavigationAgent3D")
			_require_node(label, instance, "SpeechBlip")
			var speech_blip := instance.get_node_or_null("SpeechBlip") as AudioStreamPlayer3D
			if speech_blip != null:
				var stream := speech_blip.stream as AudioStreamWAV
				if stream == null:
					_failures.append("npc_3d has no procedural speech blip stream")
				elif (
					stream.format != AudioStreamWAV.FORMAT_16_BITS
					or stream.mix_rate != 22050
					or stream.data.is_empty()
				):
					_failures.append("npc_3d speech blip PCM contract drifted")
			var npc := instance as NPC3D
			npc.set_conversation_state(true, false)
			if (
				not npc.is_interaction_focusable()
				or npc.is_interaction_enabled()
				or npc.get_interaction_label_key()
				!= &"hud.m3r.interaction.npc_preparing"
			):
				_failures.append("npc_3d does not expose its pending conversation state")
			npc.set_conversation_state(false, false)
			if npc.is_interaction_focusable():
				_failures.append("npc_3d remains focusable after conversation eligibility ends")
		"hud_3d":
			_require_node(label, instance, "Overlay/Reticle")
			_require_node(label, instance, "Overlay/PromptPanel")
			_require_node(label, instance, "Overlay/AmbientSubtitlePanel")
			_require_node(label, instance, "Overlay/SettingsShade")
			_require_node(label, instance, "Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/UiScaleOption")
			_require_node(label, instance, "Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/MasterVolumeSlider")
			_require_node(label, instance, "Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/SfxVolumeSlider")
			_require_node(label, instance, "Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/LanguageOption")
			_require_node(label, instance, "Overlay/LogShade/LogPanel")
			_require_node(label, instance, "Overlay/DebugPanel")
			if not instance.has_method("presentation_snapshot"):
				_failures.append("hud_3d exposes no presentation snapshot")
			else:
				_check_social_hud_contract(label, instance as HUD3D)
		"town_3d":
			_require_node(label, instance, "Environment/WorldEnvironment")
			_require_node(label, instance, "Geometry/Ground/TownGround/Collision")
			_require_node(label, instance, "Actors/Player3D")
			_require_node(label, instance, "Props/ExteriorDressing/BuildingSigns/StudioSign")
			_require_node(label, instance, "Props/ExteriorDressing/BuildingSigns/OfficeSign")
			_require_node(label, instance, "Props/ExteriorDressing/BuildingSigns/StationSign")
			var physical_doors := instance.get_node_or_null("Doors")
			if physical_doors != null and physical_doors.get_child_count() > 0:
				_failures.append("town_3d still contains physical doors")
			var actors := instance.get_node_or_null("Actors")
			if actors == null or actors.get_child_count() != 7:
				_failures.append("town_3d does not contain player plus six residents")
			var region := instance.get_node_or_null("Navigation/TownNavigation") as NavigationRegion3D
			if region == null or region.navigation_mesh == null:
				_failures.append("town_3d has no NavigationMesh")
			elif region.navigation_mesh.get_polygon_count() == 0:
				_failures.append("town_3d NavigationMesh has no polygons")
			else:
				_check_town_navigation(label, instance, region)
				await _check_npc_spatial_facts(label, instance)
			await _check_player_portal_clearance(label, instance)
			_check_town_location_coverage(label, instance)
			_check_respawn_anchor_contract(label, instance)
			for tree_blocker_name in [
				"TreeNorthWestBlocker",
				"TreeNorthEastBlocker",
				"TreeSouthWestBlocker",
				"TreeSouthEastBlocker",
			]:
				_require_node(label, instance, "Props/Blockers/%s/Collision" % tree_blocker_name)
			_check_town_dressing_density(label, instance)
			_check_physical_prop_startup_stability(label, instance)
			_check_record_surface_bindings(label, instance)
			if (
				not instance.has_method("is_meeting_participant_anchor")
				or not bool(instance.call(
					"is_meeting_participant_anchor",
					"NPC_Park_Caretaker",
					"Park.meeting_north_east"
				))
				or bool(instance.call(
					"is_meeting_participant_anchor",
					"NPC_Park_Caretaker",
					"Park.bench_west"
				))
			):
				_failures.append("town_3d meeting participant anchor policy drifted")
			if not instance.has_method("binding_errors"):
				_failures.append("town_3d exposes no layout binding check")
			else:
				var binding_errors: Variant = instance.call("binding_errors")
				if binding_errors is PackedStringArray and not (binding_errors as PackedStringArray).is_empty():
					_failures.append("town_3d layout bindings failed: %s" % binding_errors)
		"main_3d", "main_3d_schedule", "main_3d_ambient_inside", "main_3d_ambient_outside", "main_3d_ambient_leave":
			_require_node(label, instance, "Town")
			_require_node(label, instance, "Town/Actors/Player3D")
			_require_node(label, instance, "HUD3D")
			_require_node(label, instance, "AudioFeedback")
			_require_node(label, instance, "OnboardingOverlay")
			_require_node(label, instance, "OnboardingOverlay/Overlay/BriefPanel")
			_require_node(
				label,
				instance,
				"OnboardingOverlay/Overlay/BriefPanel/BriefMargin/BriefLines/IdentityLine"
			)
			_require_node(
				label,
				instance,
				"OnboardingOverlay/Overlay/BriefPanel/BriefMargin/BriefLines/ArrivalLine"
			)
			_require_node(
				label,
				instance,
				"OnboardingOverlay/Overlay/BriefPanel/BriefMargin/BriefLines/UncertaintyLine"
			)
			_require_node(label, instance, "RunSession")
			_require_node(label, instance, "AgentPlaytestSurface")
			_check_audio_onboarding_contract(label, instance)
			if instance.process_mode != Node.PROCESS_MODE_ALWAYS:
				_failures.append("main_3d does not process during its modal pause")
			var town := instance.get_node_or_null("Town")
			var run_session := instance.get_node_or_null("RunSession")
			if town != null and town.process_mode != Node.PROCESS_MODE_PAUSABLE:
				_failures.append("main_3d Town keeps processing during conversation")
			if run_session != null and run_session.process_mode != Node.PROCESS_MODE_ALWAYS:
				_failures.append("main_3d RunSession stops during conversation")
			if run_session != null and not run_session.has_method("encounter"):
				_failures.append("main_3d RunSession exposes no encounter endpoint")
			if label == "main_3d":
				_check_conversation_start_retry_contract(label, instance)
				_check_player_attention_hold_wiring(label, instance)
				if not instance.has_method("_sync_meeting_ambient_policy_holds"):
					_failures.append("main_3d exposes no meeting ambient hold policy")
			for surface_value in instance.get_tree().get_nodes_in_group(&"record_surfaces"):
				if not surface_value is Node:
					continue
				var surface := surface_value as Node
				if not surface.is_connected(
					&"record_surface_requested",
					Callable(instance, "_on_record_surface_requested")
				):
					_failures.append(
						"%s leaves record surface %s unwired"
						% [label, str(surface.get("surface_id"))]
					)
			var playtest_surface := instance.get_node_or_null("AgentPlaytestSurface")
			if playtest_surface == null or not playtest_surface.has_method("snapshot"):
				_failures.append("main_3d has no AgentPlaytestSurface snapshot")


func _check_conversation_start_retry_contract(label: String, instance: Node) -> void:
	if not instance.has_method("_conversation_start_requires_fresh_spatial"):
		_failures.append("%s exposes no grounded conversation retry policy" % label)
		return
	if not bool(instance.call(
		"_conversation_start_requires_fresh_spatial",
		{"error": "conversation_not_ready"}
	)):
		_failures.append("%s does not refresh spatial facts after conversation_not_ready" % label)
	if bool(instance.call(
		"_conversation_start_requires_fresh_spatial",
		{"error": "conversation_start_failed"}
	)):
		_failures.append("%s misclassifies a transport failure as stale spatial grounding" % label)


func _check_player_attention_hold_wiring(label: String, instance: Node) -> void:
	var player := instance.get_node_or_null("Town/Actors/Player3D")
	var actor := instance.get_node_or_null("Town/Actors/NPC_Roaming_Liaison") as NPC3D
	if player == null or actor == null:
		_failures.append("%s cannot stage player-attention hold wiring" % label)
		return
	if (
		not player.is_connected(
			&"preload_intent_changed",
			Callable(instance, "_on_player_preload_intent_changed")
		)
		or not player.is_connected(
			&"focus_changed",
			Callable(instance, "_on_player_focus_changed")
		)
	):
		_failures.append("%s player attention signals are not wired" % label)
		return
	player.call("_set_preload_intent_target", actor)
	player.call("_set_focused_target", null)
	var ambient_status := actor.movement_status().get("ambient", {}) as Dictionary
	if not bool(ambient_status.get("playerAttentionHeld", false)):
		_failures.append("%s preload intent did not hold resident ambient motion" % label)
	var playtest_surface := instance.get_node_or_null("AgentPlaytestSurface")
	var semantic_attention_proven := false
	if (
		playtest_surface != null
		and playtest_surface.has_method("_target_snapshot_with_player_state")
	):
		var target: Dictionary = playtest_surface.call(
			"_target_snapshot_with_player_state",
			actor,
			player,
			null,
			actor
		)
		semantic_attention_proven = (
			bool(target.get("playerPreloadIntent", false))
			and bool(target.get("playerAttentionHeld", false))
			and not bool(target.get("playerFocused", true))
			and target.has("conversationReady")
			and target.has("distanceToPlayerM")
		)
	if not semantic_attention_proven:
		_failures.append("%s playtest target omitted separated NPC attention state" % label)
	player.call("_set_focused_target", actor)
	player.call("_set_preload_intent_target", null)
	ambient_status = actor.movement_status().get("ambient", {}) as Dictionary
	if not bool(ambient_status.get("playerAttentionHeld", false)):
		_failures.append("%s focus did not preserve resident attention hold" % label)
	player.call("_set_focused_target", null)
	ambient_status = actor.movement_status().get("ambient", {}) as Dictionary
	if bool(ambient_status.get("playerAttentionHeld", true)):
		_failures.append("%s resident attention hold survived focus and intent loss" % label)


func _check_preload_failure_recovery_contract(
	label: String,
	instance: Node,
	actor_id: String
) -> void:
	var saved_queue: Array[String] = instance.get("_conversation_preload_queue").duplicate(true)
	var saved_queued: Dictionary = instance.get("_conversation_preload_queued").duplicate(true)
	var saved_queued_kinds: Dictionary = (
		instance.get("_conversation_preload_queued_cycle_kinds").duplicate(true)
	)
	var saved_in_flight: Dictionary = (
		instance.get("_conversation_preload_in_flight").duplicate(true)
	)
	var saved_retries: Dictionary = instance.get("_conversation_preload_retries").duplicate(true)
	var saved_retry_queued: Dictionary = (
		instance.get("_conversation_preload_retry_queued").duplicate(true)
	)
	var saved_requeue: Dictionary = (
		instance.get("_conversation_preload_requeue_requested").duplicate(true)
	)
	var saved_requeue_kinds: Dictionary = (
		instance.get("_conversation_preload_requeue_cycle_kinds").duplicate(true)
	)
	var saved_invalidated: Dictionary = (
		instance.get("_conversation_preload_invalidated").duplicate(true)
	)
	var saved_recovery: Dictionary = (
		instance.get("_conversation_preload_recovery_required").duplicate(true)
	)
	var saved_signatures: Dictionary = (
		instance.get("_conversation_preload_demand_signatures").duplicate(true)
	)
	var saved_epochs: Dictionary = (
		instance.get("_conversation_preload_demand_epochs").duplicate(true)
	)
	var saved_recovery_epochs: Dictionary = (
		instance.get("_conversation_preload_recovery_demand_epochs").duplicate(true)
	)
	var saved_target: Variant = instance.get("_conversation_target")
	var saved_actor: Dictionary = instance.call("_actor_view", actor_id)
	var actor_node := instance.get_node_or_null("Town/Actors/%s" % actor_id) as NPC3D

	instance.call("_sync_conversation_preload_demands", "", "", "")
	instance.call(
		"_mark_conversation_preload_recovery_required",
		actor_id,
		"smoke_retry_dropped"
	)
	if bool(instance.call("_consume_conversation_preload_recovery_demand", actor_id)):
		_failures.append("%s passive proximity reset a failed preload cycle" % label)

	instance.call("_sync_conversation_preload_demands", "", "", actor_id)
	if not bool(instance.call("_consume_conversation_preload_recovery_demand", actor_id)):
		_failures.append("%s raw aim could not recover a dropped preload cycle" % label)
	instance.call(
		"_mark_conversation_preload_recovery_required",
		actor_id,
		"smoke_retry_exhausted"
	)
	if bool(instance.call("_consume_conversation_preload_recovery_demand", actor_id)):
		_failures.append("%s one held aim opened an unbounded preload retry loop" % label)

	instance.call("_sync_conversation_preload_demands", "", "", "")
	instance.call(
		"_sync_conversation_preload_demands",
		actor_id,
		"smoke-contact-1",
		""
	)
	if not bool(instance.call("_consume_conversation_preload_recovery_demand", actor_id)):
		_failures.append("%s active contact could not start a fresh recovery cycle" % label)

	# Queue admission is not dispatch. If explicit demand disappears while an
	# invalidation/recovery entry waits behind another modal or preload, pumping
	# it must leave its eligibility intact for the next real aim/contact episode.
	if actor_node != null and not saved_actor.is_empty():
		var unavailable_actor := saved_actor.duplicate(true)
		unavailable_actor["playerConversationReady"] = false
		instance.call("_update_run_actor", unavailable_actor)
		instance.set("_conversation_target", actor_node)
		var queued_invalidation: Dictionary = {}
		queued_invalidation[actor_id] = true
		instance.set("_conversation_preload_invalidated", queued_invalidation)
		instance.set("_conversation_preload_recovery_required", {})
		instance.call("_sync_conversation_preload_demands", "", "", actor_id)
		if not bool(instance.call(
			"_queue_conversation_preload",
			actor_id,
			0,
			"invalidated"
		)):
			_failures.append("%s could not stage an invalidated preload entry" % label)
		elif not (instance.get("_conversation_preload_invalidated") as Dictionary).has(actor_id):
			_failures.append("%s queue admission consumed invalidation before dispatch" % label)
		instance.call("_sync_conversation_preload_demands", "", "", "")
		instance.set("_conversation_target", null)
		instance.call("_pump_conversation_preloads")
		if (
			not (instance.get("_conversation_preload_invalidated") as Dictionary).has(actor_id)
			or not (instance.get("_conversation_preload_queue") as Array).is_empty()
			or (instance.get("_conversation_preload_in_flight") as Dictionary).has(actor_id)
		):
			_failures.append("%s dropped queued invalidation stranded its actor" % label)

		instance.set("_conversation_target", actor_node)
		instance.set("_conversation_preload_invalidated", {})
		instance.call(
			"_mark_conversation_preload_recovery_required",
			actor_id,
			"smoke_queued_recovery"
		)
		instance.call("_sync_conversation_preload_demands", "", "", "")
		instance.call("_sync_conversation_preload_demands", "", "", actor_id)
		if not bool(instance.call(
			"_queue_conversation_preload",
			actor_id,
			0,
			"recovery"
		)):
			_failures.append("%s could not stage a recovery preload entry" % label)
		elif not (instance.get("_conversation_preload_recovery_required") as Dictionary).has(actor_id):
			_failures.append("%s queue admission consumed recovery before dispatch" % label)
		instance.call("_sync_conversation_preload_demands", "", "", "")
		instance.set("_conversation_target", null)
		instance.call("_pump_conversation_preloads")
		if (
			not (instance.get("_conversation_preload_recovery_required") as Dictionary).has(actor_id)
			or not (instance.get("_conversation_preload_queue") as Array).is_empty()
			or (instance.get("_conversation_preload_in_flight") as Dictionary).has(actor_id)
		):
			_failures.append("%s dropped queued recovery stranded its actor" % label)
		instance.call("_update_run_actor", saved_actor)

	instance.set("_conversation_preload_queue", saved_queue)
	instance.set("_conversation_preload_queued", saved_queued)
	instance.set("_conversation_preload_queued_cycle_kinds", saved_queued_kinds)
	instance.set("_conversation_preload_in_flight", saved_in_flight)
	instance.set("_conversation_preload_retries", saved_retries)
	instance.set("_conversation_preload_retry_queued", saved_retry_queued)
	instance.set("_conversation_preload_requeue_requested", saved_requeue)
	instance.set("_conversation_preload_requeue_cycle_kinds", saved_requeue_kinds)
	instance.set("_conversation_preload_invalidated", saved_invalidated)
	instance.set("_conversation_preload_recovery_required", saved_recovery)
	instance.set("_conversation_preload_demand_signatures", saved_signatures)
	instance.set("_conversation_preload_demand_epochs", saved_epochs)
	instance.set("_conversation_preload_recovery_demand_epochs", saved_recovery_epochs)
	instance.set("_conversation_target", saved_target)


func _check_preload_rebase_and_invalidation_epoch_contract(
	label: String,
	instance: Node,
	actor_id: String
) -> void:
	var actor_node := instance.get_node_or_null("Town/Actors/%s" % actor_id) as NPC3D
	var saved_actor: Dictionary = instance.call("_actor_view", actor_id)
	if actor_node == null or saved_actor.is_empty():
		_failures.append("%s cannot stage bounded preload dispatch checks" % label)
		return
	var saved_queue: Array[String] = instance.get("_conversation_preload_queue").duplicate(true)
	var saved_queued: Dictionary = instance.get("_conversation_preload_queued").duplicate(true)
	var saved_queued_kinds: Dictionary = (
		instance.get("_conversation_preload_queued_cycle_kinds").duplicate(true)
	)
	var saved_in_flight: Dictionary = (
		instance.get("_conversation_preload_in_flight").duplicate(true)
	)
	var saved_retries: Dictionary = instance.get("_conversation_preload_retries").duplicate(true)
	var saved_retry_queued: Dictionary = (
		instance.get("_conversation_preload_retry_queued").duplicate(true)
	)
	var saved_attempted: Dictionary = (
		instance.get("_conversation_preload_attempted").duplicate(true)
	)
	var saved_invalidated: Dictionary = (
		instance.get("_conversation_preload_invalidated").duplicate(true)
	)
	var saved_recovery: Dictionary = (
		instance.get("_conversation_preload_recovery_required").duplicate(true)
	)
	var saved_signatures: Dictionary = (
		instance.get("_conversation_preload_demand_signatures").duplicate(true)
	)
	var saved_epochs: Dictionary = (
		instance.get("_conversation_preload_demand_epochs").duplicate(true)
	)
	var saved_invalidation_epochs: Dictionary = (
		instance.get("_conversation_preload_invalidation_demand_epochs").duplicate(true)
	)
	var saved_recovery_epochs: Dictionary = (
		instance.get("_conversation_preload_recovery_demand_epochs").duplicate(true)
	)
	var saved_priority := str(instance.get("_conversation_preload_priority_actor_id"))
	var saved_target: Variant = instance.get("_conversation_target")
	var saved_refresh := bool(instance.get("_conversation_preload_refresh_required"))
	var saved_needs_rebase := bool(instance.get("_advance_needs_rebase"))
	var saved_rebase_in_flight := bool(instance.get("_advance_rebase_in_flight"))

	var unavailable_actor := saved_actor.duplicate(true)
	unavailable_actor["playerConversationReady"] = false
	instance.call("_update_run_actor", unavailable_actor)
	instance.set("_conversation_target", null)
	instance.set("_conversation_preload_priority_actor_id", actor_id)
	instance.set("_conversation_preload_in_flight", {})
	instance.set("_conversation_preload_queued_cycle_kinds", {})
	instance.set("_conversation_preload_retry_queued", {})
	instance.set("_conversation_preload_refresh_required", false)
	var staged_queue: Array[String] = [actor_id]
	var staged_queued: Dictionary = {}
	staged_queued[actor_id] = true
	instance.set("_conversation_preload_queue", staged_queue)
	instance.set("_conversation_preload_queued", staged_queued)

	instance.set("_advance_needs_rebase", true)
	instance.set("_advance_rebase_in_flight", false)
	instance.call("_pump_conversation_preloads")
	if (
		(instance.get("_conversation_preload_queue") as Array).size() != 1
		or not (instance.get("_conversation_preload_in_flight") as Dictionary).is_empty()
	):
		_failures.append("%s preload pump consumed work while rebase was required" % label)
	instance.set("_advance_needs_rebase", false)
	instance.set("_advance_rebase_in_flight", true)
	instance.call("_pump_conversation_preloads")
	if (
		(instance.get("_conversation_preload_queue") as Array).size() != 1
		or not (instance.get("_conversation_preload_in_flight") as Dictionary).is_empty()
	):
		_failures.append("%s preload pump consumed work during an active rebase" % label)
	instance.set("_advance_rebase_in_flight", false)
	var first_dispatch_actor := str(
		instance.call("_take_next_conversation_preload_dispatch")
	)
	var second_dispatch_actor := str(
		instance.call("_take_next_conversation_preload_dispatch")
	)
	if (
		first_dispatch_actor != actor_id
		or not second_dispatch_actor.is_empty()
		or not (instance.get("_conversation_preload_in_flight") as Dictionary).has(actor_id)
	):
		_failures.append("%s queued preload did not resume exactly once after rebase" % label)

	var empty_queue: Array[String] = []
	instance.set("_conversation_preload_queue", empty_queue)
	instance.set("_conversation_preload_queued", {})
	instance.set("_conversation_preload_queued_cycle_kinds", {})
	instance.set("_conversation_preload_in_flight", {})
	instance.set("_conversation_preload_demand_signatures", {})
	instance.set("_conversation_preload_demand_epochs", {})
	instance.set("_conversation_preload_invalidation_demand_epochs", {})
	var invalidated: Dictionary = {}
	invalidated[actor_id] = true
	instance.set("_conversation_preload_invalidated", invalidated)
	instance.call("_sync_conversation_preload_demands", "", "", actor_id)
	if not bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s first raw-aim epoch could not fund invalidation recovery" % label)
	invalidated = {}
	invalidated[actor_id] = true
	instance.set("_conversation_preload_invalidated", invalidated)
	if bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s held raw aim funded a second invalidation retry" % label)
	instance.call("_sync_conversation_preload_demands", "", "", "")
	instance.call("_sync_conversation_preload_demands", "", "", actor_id)
	if not bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s fresh raw-aim epoch did not reopen invalidation recovery" % label)

	instance.call("_sync_conversation_preload_demands", "", "", "")
	invalidated = {}
	invalidated[actor_id] = true
	instance.set("_conversation_preload_invalidated", invalidated)
	instance.call(
		"_sync_conversation_preload_demands",
		actor_id,
		"smoke-contact-epoch-a",
		""
	)
	if not bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s first contact id could not fund invalidation recovery" % label)
	invalidated = {}
	invalidated[actor_id] = true
	instance.set("_conversation_preload_invalidated", invalidated)
	instance.call(
		"_sync_conversation_preload_demands",
		actor_id,
		"smoke-contact-epoch-a",
		""
	)
	if bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s unchanged contact id funded a second invalidation retry" % label)
	instance.call(
		"_sync_conversation_preload_demands",
		actor_id,
		"smoke-contact-epoch-b",
		""
	)
	if not bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s new contact id did not reopen invalidation recovery" % label)

	instance.set("_conversation_preload_demand_signatures", {})
	instance.set("_conversation_preload_demand_epochs", {})
	instance.set("_conversation_preload_invalidation_demand_epochs", {})
	instance.set("_conversation_preload_invalidated", {})
	instance.set("_advance_needs_rebase", false)
	instance.call("_sync_conversation_preload_demands", "", "", actor_id)
	if not bool(instance.call(
		"_handle_recoverable_conversation_preload_error",
		actor_id,
		"conversation_not_ready"
	)):
		_failures.append("%s conversation_not_ready was not classified as recoverable" % label)
	if (
		not bool(instance.get("_advance_needs_rebase"))
		or not (instance.get("_conversation_preload_invalidated") as Dictionary).has(actor_id)
	):
		_failures.append("%s conversation_not_ready did not require rebase and invalidation" % label)
	instance.set("_advance_needs_rebase", false)
	if not bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s conversation_not_ready did not admit one explicit recovery" % label)
	instance.call(
		"_handle_recoverable_conversation_preload_error",
		actor_id,
		"conversation_not_ready"
	)
	instance.set("_advance_needs_rebase", false)
	if bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s repeated conversation_not_ready looped under held aim" % label)
	instance.call("_sync_conversation_preload_demands", "", "", "")
	instance.call("_sync_conversation_preload_demands", "", "", actor_id)
	if not bool(instance.call("_consume_conversation_preload_invalidation_demand", actor_id)):
		_failures.append("%s fresh aim did not recover conversation_not_ready" % label)
	instance.set("_conversation_preload_invalidated", {})
	instance.set("_advance_needs_rebase", false)
	if (
		bool(instance.call(
			"_handle_recoverable_conversation_preload_error",
			actor_id,
			"invalid_locale"
		))
		or bool(instance.get("_advance_needs_rebase"))
		or not (instance.get("_conversation_preload_invalidated") as Dictionary).is_empty()
	):
		_failures.append("%s broadened preload recovery to an arbitrary error" % label)

	instance.call("_update_run_actor", saved_actor)
	instance.set("_conversation_preload_queue", saved_queue)
	instance.set("_conversation_preload_queued", saved_queued)
	instance.set("_conversation_preload_queued_cycle_kinds", saved_queued_kinds)
	instance.set("_conversation_preload_in_flight", saved_in_flight)
	instance.set("_conversation_preload_retries", saved_retries)
	instance.set("_conversation_preload_retry_queued", saved_retry_queued)
	instance.set("_conversation_preload_attempted", saved_attempted)
	instance.set("_conversation_preload_invalidated", saved_invalidated)
	instance.set("_conversation_preload_recovery_required", saved_recovery)
	instance.set("_conversation_preload_demand_signatures", saved_signatures)
	instance.set("_conversation_preload_demand_epochs", saved_epochs)
	instance.set(
		"_conversation_preload_invalidation_demand_epochs",
		saved_invalidation_epochs
	)
	instance.set("_conversation_preload_recovery_demand_epochs", saved_recovery_epochs)
	instance.set("_conversation_preload_priority_actor_id", saved_priority)
	instance.set("_conversation_preload_refresh_required", saved_refresh)
	instance.set("_advance_needs_rebase", saved_needs_rebase)
	instance.set("_advance_rebase_in_flight", saved_rebase_in_flight)
	instance.set("_conversation_target", saved_target)


func _check_conversation_start_not_ready_recovery_contract(
	label: String,
	instance: Node,
	actor_id: String
) -> void:
	var actor_node := instance.get_node_or_null("Town/Actors/%s" % actor_id) as NPC3D
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	var saved_actor: Dictionary = instance.call("_actor_view", actor_id)
	if actor_node == null or player == null or hud == null or saved_actor.is_empty():
		_failures.append("%s cannot stage final conversation start recovery" % label)
		return
	var saved_snapshot: Dictionary = instance.get("_run_snapshot").duplicate(true)
	var saved_queue: Array[String] = instance.get("_conversation_preload_queue").duplicate(true)
	var saved_queued: Dictionary = instance.get("_conversation_preload_queued").duplicate(true)
	var saved_queued_kinds: Dictionary = (
		instance.get("_conversation_preload_queued_cycle_kinds").duplicate(true)
	)
	var saved_in_flight: Dictionary = (
		instance.get("_conversation_preload_in_flight").duplicate(true)
	)
	var saved_attempted: Dictionary = (
		instance.get("_conversation_preload_attempted").duplicate(true)
	)
	var saved_invalidated: Dictionary = (
		instance.get("_conversation_preload_invalidated").duplicate(true)
	)
	var saved_recovery: Dictionary = (
		instance.get("_conversation_preload_recovery_required").duplicate(true)
	)
	var saved_retries: Dictionary = instance.get("_conversation_preload_retries").duplicate(true)
	var saved_retry_queued: Dictionary = (
		instance.get("_conversation_preload_retry_queued").duplicate(true)
	)
	var saved_signatures: Dictionary = (
		instance.get("_conversation_preload_demand_signatures").duplicate(true)
	)
	var saved_epochs: Dictionary = (
		instance.get("_conversation_preload_demand_epochs").duplicate(true)
	)
	var saved_invalidation_epochs: Dictionary = (
		instance.get("_conversation_preload_invalidation_demand_epochs").duplicate(true)
	)
	var saved_recovery_epochs: Dictionary = (
		instance.get("_conversation_preload_recovery_demand_epochs").duplicate(true)
	)
	var saved_priority := str(instance.get("_conversation_preload_priority_actor_id"))
	var saved_target: Variant = instance.get("_conversation_target")
	var saved_active_contact: Dictionary = instance.get("_active_contact").duplicate(true)
	var saved_pending_contact_id := str(instance.get("_pending_contact_ready_id"))
	var saved_conversation_contact_id := str(instance.get("_conversation_contact_id"))
	var saved_conversation_contact_zone_id := str(
		instance.get("_conversation_contact_zone_id")
	)
	var saved_needs_rebase := bool(instance.get("_advance_needs_rebase"))
	var saved_rebase_in_flight := bool(instance.get("_advance_rebase_in_flight"))
	var saved_paused := paused
	var saved_control := bool(player.get("_control_enabled"))
	var saved_look: Vector2 = player.call("look_orientation")
	var saved_return_look: Vector2 = instance.get("_conversation_return_look")
	var saved_return_look_valid := bool(
		instance.get("_conversation_return_look_valid")
	)

	var attempted: Dictionary = {}
	attempted[actor_id] = true
	var empty_queue: Array[String] = []
	instance.set("_conversation_preload_queue", empty_queue)
	instance.set("_conversation_preload_queued", {})
	instance.set("_conversation_preload_queued_cycle_kinds", {})
	instance.set("_conversation_preload_in_flight", {})
	instance.set("_conversation_preload_attempted", attempted)
	instance.set("_conversation_preload_invalidated", {})
	instance.set("_conversation_preload_recovery_required", {})
	instance.set("_conversation_preload_retries", {})
	instance.set("_conversation_preload_retry_queued", {})
	instance.set("_conversation_preload_demand_signatures", {})
	instance.set("_conversation_preload_demand_epochs", {})
	instance.set("_conversation_preload_invalidation_demand_epochs", {})
	instance.set("_conversation_preload_recovery_demand_epochs", {})
	instance.set("_conversation_preload_priority_actor_id", actor_id)
	instance.set("_advance_needs_rebase", false)
	# Keep the handler's deferred rebase from issuing a fixture request while
	# this focused state machine proof inspects the exact post-error boundary.
	instance.set("_advance_rebase_in_flight", true)
	instance.set("_conversation_target", actor_node)
	var staged_snapshot := instance.get("_run_snapshot") as Dictionary
	var staged_clock := staged_snapshot.get("worldClock", {}) as Dictionary
	var elapsed_seconds := float(
		staged_clock.get("elapsedSeconds", 0.0)
	)
	var start_error_contact_id := "contact-smoke-start-not-ready"
	var start_error_contact := {
		"contactId": start_error_contact_id,
		"actorId": actor_id,
		"interactionZoneId": "StudioReceptionConversation",
		"originAnchorRef": "Studio.receptionist_spawn",
		"safeDistanceM": 1.6,
		"issuedAtSeconds": elapsed_seconds,
		"expiresAtSeconds": elapsed_seconds + 120.0,
		"reason": "smoke_start_not_ready",
		"procedure": "ordinary",
	}
	instance.set("_active_contact", start_error_contact)
	staged_snapshot["activeContact"] = start_error_contact.duplicate(true)
	instance.set("_run_snapshot", staged_snapshot)
	instance.set("_conversation_contact_id", start_error_contact_id)
	instance.set("_conversation_contact_zone_id", "StudioReceptionConversation")
	var return_look := Vector2(0.42, -0.18)
	player.call("set_look_orientation", return_look)
	instance.set("_conversation_return_look", return_look)
	instance.set("_conversation_return_look_valid", true)
	player.call("face_position", actor_node.get_interaction_aim_position())
	player.set_control_enabled(false)
	hud.begin_conversation(saved_actor)
	paused = true
	await instance.call(
		"_handle_conversation_start_result",
		{"error": "conversation_not_ready"},
		int(instance.get("_lifecycle_generation"))
	)
	if (
		not bool(instance.get("_advance_needs_rebase"))
		or not (instance.get("_conversation_preload_invalidated") as Dictionary).has(
			actor_id
		)
		or bool(instance.call("_actor_view", actor_id).get(
			"playerConversationReady",
			true
		))
		or instance.get("_conversation_target") != null
		or str(instance.get("_pending_contact_ready_id")) != start_error_contact_id
		or hud.conversation_visible()
	):
		_failures.append(
			"%s final conversation_not_ready did not enter recoverable rebase state" % label
		)
	if (
		(player.call("look_orientation") as Vector2).distance_to(return_look) > 0.001
		or bool(instance.get("_conversation_return_look_valid"))
	):
		_failures.append(
			"%s failed conversation start did not restore the player's prior view" % label
		)
	# Consume the handler's deferred callback while the in-flight guard is still
	# set, then apply the same accepted full-snapshot path used by a real rebase.
	await process_frame
	var rebased_snapshot: Dictionary = instance.get("_run_snapshot").duplicate(true)
	instance.call("_replace_run_snapshot", rebased_snapshot, true)
	instance.call("_apply_social_view_from_response", rebased_snapshot, true)
	instance.set("_advance_needs_rebase", false)
	instance.set("_advance_rebase_in_flight", false)
	instance.set("_conversation_target", actor_node)
	instance.call("_sync_conversation_preload_demands", "", "", actor_id)
	var queued_retry := bool(instance.call(
		"_queue_conversation_preload",
		actor_id,
		0,
		"invalidated"
	))
	instance.set("_conversation_target", null)
	var dispatched_actor := str(instance.call("_take_next_conversation_preload_dispatch"))
	if (
		not queued_retry
		or dispatched_actor != actor_id
		or not (instance.get("_conversation_preload_in_flight") as Dictionary).has(actor_id)
	):
		_failures.append(
			"%s rebase plus one explicit aim could not retry final conversation_not_ready"
			% label
		)

	actor_node.cancel_player_contact()
	instance.set("_run_snapshot", saved_snapshot)
	instance.call("_apply_all_conversation_readiness")
	instance.set("_conversation_preload_queue", saved_queue)
	instance.set("_conversation_preload_queued", saved_queued)
	instance.set("_conversation_preload_queued_cycle_kinds", saved_queued_kinds)
	instance.set("_conversation_preload_in_flight", saved_in_flight)
	instance.set("_conversation_preload_attempted", saved_attempted)
	instance.set("_conversation_preload_invalidated", saved_invalidated)
	instance.set("_conversation_preload_recovery_required", saved_recovery)
	instance.set("_conversation_preload_retries", saved_retries)
	instance.set("_conversation_preload_retry_queued", saved_retry_queued)
	instance.set("_conversation_preload_demand_signatures", saved_signatures)
	instance.set("_conversation_preload_demand_epochs", saved_epochs)
	instance.set(
		"_conversation_preload_invalidation_demand_epochs",
		saved_invalidation_epochs
	)
	instance.set("_conversation_preload_recovery_demand_epochs", saved_recovery_epochs)
	instance.set("_conversation_preload_priority_actor_id", saved_priority)
	instance.set("_advance_needs_rebase", saved_needs_rebase)
	instance.set("_advance_rebase_in_flight", saved_rebase_in_flight)
	instance.set("_conversation_target", saved_target)
	instance.set("_active_contact", saved_active_contact)
	instance.set("_pending_contact_ready_id", saved_pending_contact_id)
	instance.set("_conversation_contact_id", saved_conversation_contact_id)
	instance.set("_conversation_contact_zone_id", saved_conversation_contact_zone_id)
	instance.set("_conversation_return_look", saved_return_look)
	instance.set("_conversation_return_look_valid", saved_return_look_valid)
	player.call("set_look_orientation", saved_look)
	player.set_control_enabled(saved_control)
	paused = saved_paused


func _check_stale_advance_response_contract(label: String, instance: Node) -> void:
	var saved_snapshot: Dictionary = instance.get("_run_snapshot").duplicate(true)
	var saved_social: Dictionary = instance.get("_social_view").duplicate(true)
	var saved_accepted: Array = instance.get("_last_accepted_prop_event_ids").duplicate(true)
	var saved_memories: Array = instance.get("_last_prop_observation_memories").duplicate(true)
	var saved_cursor := int(instance.get("_ambient_speech_cursor"))
	var saved_events: Array = instance.get("_ambient_speech_events").duplicate(true)
	var saved_recent_wakes: Array = instance.get("_recent_schedule_wakes").duplicate(true)
	var saved_wake_queue: Array[Dictionary] = instance.get("_ambient_wake_queue").duplicate(true)
	var saved_claimed: Dictionary = instance.get("_ambient_claimed_wake_ids").duplicate(true)
	var saved_pending: Dictionary = instance.get("_ambient_pending_request").duplicate(true)
	var saved_pending_kind := str(instance.get("_ambient_pending_wake_kind"))
	var saved_pending_dispatched := bool(instance.get("_ambient_pending_request_dispatched"))
	var saved_needs_rebase := bool(instance.get("_advance_needs_rebase"))
	var saved_rebase_in_flight := bool(instance.get("_advance_rebase_in_flight"))
	var saved_decision_in_flight := bool(instance.get("_ambient_decision_in_flight"))
	var current_revision := int(saved_snapshot.get("worldRevision", 1))
	var stale_wake := {
		"wakeId": "wake-stale-smoke",
		"kind": "goal",
		"status": "pending",
		"requiresDecision": true,
		"scheduledAtSeconds": 0.0,
		"observedWorldRevision": current_revision - 1,
	}
	instance.call("_apply_advance_response", {
		"worldRevision": current_revision - 1,
		"clock": {"toSeconds": 9999.0},
		"socialView": {"revision": 9999},
		"acceptedPropEventIds": ["stale-prop"],
		"propObservationMemories": [{"memoryId": "stale-memory"}],
		"ambientSpeechCursor": saved_cursor + 1,
		"ambientSpeechEvents": [{
			"seq": saved_cursor + 1,
			"speakerActorId": "NPC_Studio_Receptionist",
			"line": "stale",
		}],
		"scheduleWakes": [stale_wake],
	})
	if not bool(instance.get("_advance_needs_rebase")):
		_failures.append("%s stale advance did not require an authoritative rebase" % label)
	if (
		instance.get("_run_snapshot") != saved_snapshot
		or instance.get("_social_view") != saved_social
		or instance.get("_last_accepted_prop_event_ids") != saved_accepted
		or instance.get("_last_prop_observation_memories") != saved_memories
		or int(instance.get("_ambient_speech_cursor")) != saved_cursor
		or instance.get("_ambient_speech_events") != saved_events
		or instance.get("_recent_schedule_wakes") != saved_recent_wakes
		or instance.get("_ambient_wake_queue") != saved_wake_queue
	):
		_failures.append("%s stale advance mutated revision-sensitive client state" % label)

	var guarded_wake_queue: Array[Dictionary] = [stale_wake.duplicate(true)]
	instance.set("_ambient_wake_queue", guarded_wake_queue)
	instance.set("_ambient_claimed_wake_ids", {"wake-stale-smoke": true})
	instance.set("_ambient_pending_request", {})
	instance.set("_ambient_pending_wake_kind", "")
	instance.set("_ambient_pending_request_dispatched", false)
	instance.set("_ambient_decision_in_flight", false)
	instance.call("_prepare_next_ambient_decision")
	if (
		not (instance.get("_ambient_pending_request") as Dictionary).is_empty()
		or (instance.get("_ambient_wake_queue") as Array).size() != 1
	):
		_failures.append("%s stale goal was prepared before rebase" % label)
	instance.set("_ambient_pending_request", {
		"runId": saved_snapshot.get("runId", ""),
		"wakeId": "wake-stale-smoke",
		"observedWorldRevision": current_revision - 1,
	})
	instance.set("_ambient_pending_wake_kind", "goal")
	instance.call("_dispatch_ambient_decision")
	if bool(instance.get("_ambient_decision_in_flight")):
		_failures.append("%s stale goal dispatched before rebase" % label)

	var recovered_goal := {
		"wakeId": "wake-rebase-goal-smoke",
		"kind": "goal",
		"status": "pending",
		"requiresDecision": true,
		"scheduledAtSeconds": 1.0,
		"observedWorldRevision": current_revision,
	}
	var recovered_meeting := {
		"wakeId": "wake-rebase-meeting-smoke",
		"kind": "meeting_ready",
		"status": "pending",
		"requiresDecision": true,
		"scheduledAtSeconds": 2.0,
		"observedWorldRevision": current_revision,
	}
	var dispatched_wake := {
		"wakeId": "wake-rebase-dispatched-smoke",
		"kind": "goal",
		"status": "pending",
		"requiresDecision": true,
		"scheduledAtSeconds": 0.0,
		"observedWorldRevision": current_revision,
	}
	instance.set("_ambient_wake_queue", [])
	instance.set("_ambient_claimed_wake_ids", {
		"wake-rebase-dispatched-smoke": true,
	})
	instance.set("_ambient_pending_request", {
		"runId": saved_snapshot.get("runId", ""),
		"wakeId": "wake-rebase-dispatched-smoke",
		"observedWorldRevision": current_revision,
	})
	instance.set("_ambient_pending_wake_kind", "goal")
	instance.set("_ambient_pending_request_dispatched", true)
	instance.call("_recover_ambient_decision_wakes_after_rebase", {
		"pendingWakes": [dispatched_wake, recovered_goal, recovered_meeting],
	})
	var recovered_counts := {
		"wake-rebase-goal-smoke": 0,
		"wake-rebase-meeting-smoke": 0,
		"wake-rebase-dispatched-smoke": 0,
	}
	for wake_value in instance.get("_ambient_wake_queue") as Array:
		if wake_value is Dictionary:
			var wake_id := str((wake_value as Dictionary).get("wakeId", ""))
			if recovered_counts.has(wake_id):
				recovered_counts[wake_id] = int(recovered_counts[wake_id]) + 1
	if (
		int(recovered_counts["wake-rebase-goal-smoke"]) != 1
		or int(recovered_counts["wake-rebase-meeting-smoke"]) != 1
		or int(recovered_counts["wake-rebase-dispatched-smoke"]) != 0
	):
		_failures.append(
			"%s rebase recovery did not queue authoritative wakes exactly once" % label
		)
	if (
		str((instance.get("_ambient_pending_request") as Dictionary).get(
			"wakeId",
			""
		)) != "wake-rebase-dispatched-smoke"
		or not bool(instance.get("_ambient_pending_request_dispatched"))
	):
		_failures.append(
			"%s rebase recovery replaced or duplicated an already-dispatched wake" % label
		)

	instance.set("_run_snapshot", saved_snapshot)
	instance.set("_social_view", saved_social)
	instance.set("_last_accepted_prop_event_ids", saved_accepted)
	instance.set("_last_prop_observation_memories", saved_memories)
	instance.set("_ambient_speech_cursor", saved_cursor)
	instance.set("_ambient_speech_events", saved_events)
	instance.set("_recent_schedule_wakes", saved_recent_wakes)
	instance.set("_ambient_wake_queue", saved_wake_queue)
	instance.set("_ambient_claimed_wake_ids", saved_claimed)
	instance.set("_ambient_pending_request", saved_pending)
	instance.set("_ambient_pending_wake_kind", saved_pending_kind)
	instance.set("_ambient_pending_request_dispatched", saved_pending_dispatched)
	instance.set("_advance_needs_rebase", saved_needs_rebase)
	instance.set("_advance_rebase_in_flight", saved_rebase_in_flight)
	instance.set("_ambient_decision_in_flight", saved_decision_in_flight)


func _check_monotonic_grace_clock_rebase_contract(label: String, instance: Node) -> void:
	var saved_snapshot: Dictionary = instance.get("_run_snapshot").duplicate(true)
	var saved_evidence_run_id := str(instance.get("_accepted_provider_evidence_run_id"))
	var saved_audit: Dictionary = instance.get("_accepted_provider_audit").duplicate(true)
	var saved_trace: Dictionary = (
		instance.get("_accepted_provider_runtime_trace").duplicate(true)
	)
	var saved_source := str(instance.get("_accepted_provider_evidence_source"))
	var saved_response_revision := int(
		instance.get("_accepted_provider_evidence_response_revision")
	)
	instance.set("_run_snapshot", {
		"runId": "run-clock-monotonic-smoke",
		"worldRevision": 9,
		"worldClock": {
			"elapsedSeconds": 159.0,
			"graceEndsAtSeconds": 90.0,
			"hearingAtSeconds": 900.0,
			"paused": false,
			"graceEnded": true,
		},
	})
	instance.call("_replace_run_snapshot", {
		"runId": "run-clock-monotonic-smoke",
		"worldRevision": 10,
		"worldClock": {
			"elapsedSeconds": 177.0,
			"graceEndsAtSeconds": 90.0,
			"hearingAtSeconds": 900.0,
			"paused": false,
		},
	}, true)
	var rebased_snapshot: Dictionary = instance.get("_run_snapshot")
	var rebased_clock: Dictionary = rebased_snapshot.get("worldClock", {})
	if (
		not bool(rebased_clock.get("graceEnded", false))
		or float(rebased_clock.get("elapsedSeconds", -1.0)) != 177.0
	):
		_failures.append(
			"%s same-run rebase rolled back grace end or invented elapsed time" % label
		)

	instance.call("_replace_run_snapshot", {
		"runId": "run-clock-fresh-smoke",
		"worldRevision": 0,
		"worldClock": {
			"elapsedSeconds": 0.0,
			"graceEndsAtSeconds": 90.0,
			"hearingAtSeconds": 900.0,
			"paused": false,
		},
	}, true)
	var fresh_snapshot: Dictionary = instance.get("_run_snapshot")
	var fresh_clock: Dictionary = fresh_snapshot.get("worldClock", {})
	if (
		bool(fresh_clock.get("graceEnded", false))
		or float(fresh_clock.get("elapsedSeconds", -1.0)) != 0.0
	):
		_failures.append("%s fresh run inherited the previous run's grace end" % label)
	instance.set("_run_snapshot", saved_snapshot)
	instance.set("_accepted_provider_evidence_run_id", saved_evidence_run_id)
	instance.set("_accepted_provider_audit", saved_audit)
	instance.set("_accepted_provider_runtime_trace", saved_trace)
	instance.set("_accepted_provider_evidence_source", saved_source)
	instance.set("_accepted_provider_evidence_response_revision", saved_response_revision)


func _provider_evidence_packet(
	run_id: String,
	world_revision: int,
	call_count: int,
	resolution_count: int,
	trace_count: int
) -> Dictionary:
	var calls: Array = []
	for sequence in range(1, call_count + 1):
		calls.append({
			"seq": sequence,
			"purpose": "agent_step",
			"profileId": "modelscope/qwen3.7-plus",
			"transport": "live",
			"usedFallback": false,
			"outcome": "success",
			"failureReason": null,
			"chargedTokens": 10,
		})
	var resolutions: Array = []
	for sequence in range(1, resolution_count + 1):
		resolutions.append({
			"seq": sequence,
			"purpose": "agent_step",
			"profileId": "modelscope/qwen3.7-plus",
			"transport": "live",
			"usedFallback": false,
			"fallbackReason": null,
			"callSeqs": [mini(sequence, maxi(1, call_count))],
		})
	var trace_entries: Array = []
	for sequence in range(1, trace_count + 1):
		trace_entries.append({
			"seq": sequence,
			"meta": {
				"profileId": "modelscope/qwen3.7-plus",
				"transport": "live",
				"usedFallback": false,
			},
		})
	return {
		"runId": run_id,
		"worldRevision": world_revision,
		"providerBudget": {
			"callsUsed": call_count,
			"tokensUsed": call_count * 10,
		},
		"providerAudit": {
			"callsUsed": call_count,
			"tokensUsed": call_count * 10,
			"inFlightCalls": 0,
			"inFlightTokens": 0,
			"complete": true,
			"truncated": false,
			"droppedCount": 0,
			"calls": calls,
			"resolutions": resolutions,
		},
		"providerRuntimeTrace": {
			"complete": true,
			"truncated": false,
			"droppedCount": 0,
			"entries": trace_entries,
		},
	}


func _provider_evidence_progress_from_snapshot(
	instance: Node,
	snapshot: Dictionary
) -> Array[int]:
	return instance.call(
		"_provider_evidence_progress",
		snapshot.get("providerAudit", {}) as Dictionary,
		snapshot.get("providerRuntimeTrace", {}) as Dictionary
	) as Array[int]


func _provider_progress_is_at_least(
	candidate: Array[int],
	baseline: Array[int]
) -> bool:
	if candidate.size() != baseline.size():
		return false
	for index in candidate.size():
		if candidate[index] < baseline[index]:
			return false
	return true


func _check_provider_evidence_freshness_contract(
	label: String,
	instance: Node
) -> void:
	var saved_snapshot: Dictionary = instance.get("_run_snapshot").duplicate(true)
	var saved_evidence_run_id := str(instance.get("_accepted_provider_evidence_run_id"))
	var saved_audit: Dictionary = instance.get("_accepted_provider_audit").duplicate(true)
	var saved_trace: Dictionary = (
		instance.get("_accepted_provider_runtime_trace").duplicate(true)
	)
	var saved_source := str(instance.get("_accepted_provider_evidence_source"))
	var saved_response_revision := int(
		instance.get("_accepted_provider_evidence_response_revision")
	)
	var saved_preloads: Dictionary = (
		instance.get("_conversation_preload_in_flight").duplicate(true)
	)
	var saved_decision_in_flight := bool(instance.get("_ambient_decision_in_flight"))
	var saved_resolving_answer := bool(instance.get("_resolving_answer"))

	var run_id := "run-provider-freshness-smoke"
	instance.set("_run_snapshot", _provider_evidence_packet(run_id, 10, 0, 0, 0))
	instance.call("_reset_accepted_provider_evidence", run_id)
	var preload_response := _provider_evidence_packet(run_id, 11, 1, 1, 1)
	instance.call("_cache_provider_evidence", preload_response, "preload")
	var after_preload: Dictionary = instance.get("_run_snapshot")
	if (
		int((after_preload.get("providerAudit", {}) as Dictionary).get("callsUsed", -1)) != 1
		or int(((after_preload.get("providerRuntimeTrace", {}) as Dictionary).get(
			"entries", []
		) as Array).size()) != 1
	):
		_failures.append("%s preload evidence waited for a snapshot rebase" % label)

	var decision_response := _provider_evidence_packet(run_id, 12, 3, 3, 3)
	instance.call("_cache_provider_evidence", decision_response, "npc_decision")
	var after_decision: Dictionary = instance.get("_run_snapshot")
	if (
		int((after_decision.get("providerAudit", {}) as Dictionary).get("callsUsed", -1)) != 3
		or int(((after_decision.get("providerRuntimeTrace", {}) as Dictionary).get(
			"entries", []
		) as Array).size()) != 3
	):
		_failures.append("%s NPC decision evidence waited for a snapshot rebase" % label)

	# A response with farther audit counters but an older runtime trace must be
	# rejected as one pair; accepting its audit alone would synthesize evidence
	# that no server response actually carried.
	instance.call(
		"_cache_provider_evidence",
		_provider_evidence_packet(run_id, 13, 4, 4, 2),
		"out_of_order"
	)
	var after_out_of_order: Dictionary = instance.get("_run_snapshot")
	var freshness: Dictionary = instance.call("_provider_evidence_freshness_snapshot")
	if (
		int((after_out_of_order.get("providerAudit", {}) as Dictionary).get(
			"callsUsed", -1
		)) != 3
		or int(((after_out_of_order.get("providerRuntimeTrace", {}) as Dictionary).get(
			"entries", []
		) as Array).size()) != 3
		or freshness.get("progress", []) != [3, 3, 3, 3]
		or str(freshness.get("sourceKind", "")) != "npc_decision"
	):
		_failures.append("%s accepted an out-of-order provider evidence pair" % label)

	# Even a higher world revision is not a provider-evidence freshness key.
	instance.call(
		"_replace_run_snapshot",
		_provider_evidence_packet(run_id, 999, 2, 2, 2),
		true
	)
	var after_rebase: Dictionary = instance.get("_run_snapshot")
	if (
		int((after_rebase.get("providerAudit", {}) as Dictionary).get("callsUsed", -1)) != 3
		or int(((after_rebase.get("providerRuntimeTrace", {}) as Dictionary).get(
			"entries", []
		) as Array).size()) != 3
	):
		_failures.append("%s older full snapshot rolled provider evidence backward" % label)

	instance.set("_conversation_preload_in_flight", {"NPC_Test": true})
	instance.set("_ambient_decision_in_flight", true)
	instance.set("_resolving_answer", true)
	var busy_freshness: Dictionary = instance.call("_provider_evidence_freshness_snapshot")
	if int(busy_freshness.get("clientProviderRequestInFlightCount", -1)) != 3:
		_failures.append("%s did not expose all client-known provider requests" % label)

	instance.call(
		"_replace_run_snapshot",
		_provider_evidence_packet("run-provider-freshness-new", 0, 0, 0, 0),
		false
	)
	var fresh_run_evidence: Dictionary = instance.call(
		"_provider_evidence_freshness_snapshot"
	)
	if (
		str(fresh_run_evidence.get("acceptedRunId", ""))
		!= "run-provider-freshness-new"
		or fresh_run_evidence.get("progress", []) != [0, 0, 0, 0]
	):
		_failures.append("%s carried provider evidence across a run boundary" % label)

	instance.set("_run_snapshot", saved_snapshot)
	instance.set("_accepted_provider_evidence_run_id", saved_evidence_run_id)
	instance.set("_accepted_provider_audit", saved_audit)
	instance.set("_accepted_provider_runtime_trace", saved_trace)
	instance.set("_accepted_provider_evidence_source", saved_source)
	instance.set("_accepted_provider_evidence_response_revision", saved_response_revision)
	instance.set("_conversation_preload_in_flight", saved_preloads)
	instance.set("_ambient_decision_in_flight", saved_decision_in_flight)
	instance.set("_resolving_answer", saved_resolving_answer)


func _check_audio_onboarding_contract(label: String, instance: Node) -> void:
	var audio := instance.get_node_or_null("AudioFeedback")
	if audio != null:
		if not audio.has_method("presentation_snapshot"):
			_failures.append("%s audio feedback exposes no presentation snapshot" % label)
		else:
			var snapshot: Dictionary = audio.call("presentation_snapshot")
			if not bool(snapshot.get("procedural", false)):
				_failures.append("%s audio feedback is not using its project-owned streams" % label)
			if not bool(snapshot.get("parkPlaying", false)) or not bool(snapshot.get("interiorPlaying", false)):
				_failures.append("%s zone ambience did not start" % label)
			if int(snapshot.get("recordSurfaces", 0)) <= 0:
				_failures.append("%s record scribble is not bound to any surface" % label)
			if int(snapshot.get("speechBlipActors", 0)) <= 0:
				_failures.append("%s reuses no spatial NPC speech blips" % label)
			if int(snapshot.get("trackedProps", 0)) < 3:
				_failures.append("%s prop impact audio tracks fewer than three props" % label)
			if int(snapshot.get("propImpacts", -1)) != 0:
				_failures.append("%s played prop impact audio during startup settle" % label)
		for player_path in [
			"Footstep",
			"ParkAmbience",
			"InteriorAmbience",
			"PropImpact",
			"RecordScribble",
		]:
			var player := audio.get_node_or_null(player_path)
			if player == null:
				_failures.append("%s audio feedback is missing %s" % [label, player_path])
				continue
			var stream := player.get("stream") as AudioStreamWAV
			if stream == null or stream.data.is_empty():
				_failures.append("%s %s has no synthesized PCM stream" % [label, player_path])
			if StringName(player.get("bus")) != &"SFX":
				_failures.append("%s %s bypasses the SFX bus" % [label, player_path])

	var onboarding := instance.get_node_or_null("OnboardingOverlay")
	if onboarding == null:
		return
	if not onboarding.has_method("presentation_snapshot"):
		_failures.append("%s onboarding exposes no presentation snapshot" % label)
		return
	if not onboarding.has_method("set_player_brief"):
		_failures.append("%s onboarding cannot bind the public run brief" % label)
	var onboarding_snapshot: Dictionary = onboarding.call("presentation_snapshot")
	if str(onboarding_snapshot.get("key", "")) != "hud.m3r.onboarding.move_jump":
		_failures.append("%s onboarding does not begin with movement and jump" % label)
	if str(onboarding_snapshot.get("text", "")).is_empty():
		_failures.append("%s onboarding renders an empty localized hint" % label)
	var brief_snapshot := onboarding_snapshot.get("playerBrief", {}) as Dictionary
	if not brief_snapshot.has("configured") or not brief_snapshot.has("lines"):
		_failures.append("%s onboarding exposes no optional player-brief state" % label)


func _check_player_brief_contract(label: String, instance: Node) -> void:
	var onboarding := instance.get_node_or_null("OnboardingOverlay")
	if onboarding == null or not onboarding.has_method("presentation_snapshot"):
		return
	var fixture := _load_run_fixture()
	var endpoints := fixture.get("endpoints", {}) as Dictionary
	var run_start := endpoints.get("runStart", {}) as Dictionary
	var run_response := run_start.get("response", {}) as Dictionary
	var expected_value: Variant = run_response.get("playerBrief")
	var snapshot := onboarding.call("presentation_snapshot") as Dictionary
	var displayed := snapshot.get("playerBrief", {}) as Dictionary
	if not expected_value is Dictionary:
		if bool(displayed.get("configured", false)) or bool(displayed.get("visible", false)):
			_failures.append("%s invents a player brief for a legacy snapshot" % label)
		return
	var expected := expected_value as Dictionary
	var localization := root.get_node_or_null("Localization")
	if localization == null:
		_failures.append("%s cannot resolve the player brief without Localization" % label)
		return
	var locale_name := str(localization.call("locale"))
	var expected_lines: Array[String] = []
	for field_name in ["identityKey", "arrivalKey", "uncertaintyKey"]:
		var key := str(expected.get(field_name, ""))
		var line := str(localization.call("content_message", locale_name, key)).strip_edges()
		if key.is_empty() or line.is_empty() or line == key:
			_failures.append("%s fixture player brief has an unresolved %s" % [label, field_name])
			return
		expected_lines.append(line)
	var displayed_lines: Array[String] = []
	for line_value in displayed.get("lines", []):
		displayed_lines.append(str(line_value))
	if (
		not bool(displayed.get("configured", false))
		or not bool(displayed.get("visible", false))
		or displayed_lines != expected_lines
	):
		_failures.append("%s does not visibly resolve the authoritative three-line player brief" % label)
	for raw_key in expected.values():
		if displayed_lines.has(str(raw_key)):
			_failures.append("%s exposes a raw player-brief localization key" % label)
			break

func _check_social_hud_contract(label: String, hud: HUD3D) -> void:
	if hud == null:
		return
	var sample_view := {
		"revision": 2,
		"hearing": {"atSeconds": 900, "due": false},
		"pressure": {
			"band": "raised",
			"latestEncounteredWhyLine": "접수 기록이 검토 대기 상태입니다.",
		},
		"encounteredResidents": [{
			"actorId": "NPC_Studio_Receptionist",
			"stance": "uncertain",
			"stanceRevision": 1,
			"whyLine": "답변의 확인 순서가 남아 있습니다.",
			"provenance": {
				"originKind": "speech",
				"originActorId": "NPC_Studio_Receptionist",
				"recipientKind": "listener",
				"recipientActorId": "player",
				"sourceMemoryId": "hidden-memory-id",
				"recordId": null,
				"recordRevision": null,
				"ledgerEventId": null,
				"sourceExcerpt": "방문자가 접수 순서를 직접 설명했습니다.",
				"whyLine": "직접 들은 답변입니다.",
			},
		}],
		"openQuestions": [{
			"questionId": "hidden-question-id",
			"subjectActorId": "NPC_Studio_Receptionist",
			"status": "open",
			"text": "접수 순서를 누가 확인했는가?",
			"whyLine": "확인 주체가 아직 드러나지 않았습니다.",
			"provenance": {
				"originKind": "record",
				"originActorId": "NPC_Studio_Receptionist",
				"recipientKind": "reader",
				"recipientActorId": "player",
				"sourceMemoryId": "hidden-record-source-memory-id",
				"recordId": "hidden-record-id",
				"recordRevision": 1,
				"ledgerEventId": "hidden-ledger-id",
				"sourceExcerpt": "방문 경위가 기록 본문에 남았습니다.",
				"whyLine": "접수 기록이 검토 대기 상태입니다.",
			},
		}],
		"encounteredRecords": [{
			"recordId": "hidden-record-id",
			"kind": "note",
			"authorActorId": "NPC_Studio_Receptionist",
			"targetId": "player",
			"stateBody": "접수 순서 확인이 보류되었습니다.",
			"recordRevision": 1,
			"lastLedgerEventId": "hidden-ledger-id",
			"provenance": null,
		}],
		"hiddenSuspicion": 99,
	}
	if not hud.set_social_view(sample_view):
		_failures.append("%s rejected a newer authoritative social view" % label)
		return
	var frame_label := hud.get_node_or_null(
		"Overlay/EncounteredStancePanel/EncounteredStanceMargin/EncounteredStanceLabel"
	) as Label
	var first_hearing_text := frame_label.text if frame_label != null else ""
	if not first_hearing_text.contains("15"):
		_failures.append("%s hearing frame does not show one fixed scheduled time" % label)
	if first_hearing_text.contains("접수 기록이 검토 대기 상태입니다."):
		_failures.append("%s permanent pressure frame leaked its encountered reason" % label)
	var stale_view := sample_view.duplicate(true)
	stale_view["revision"] = 1
	stale_view["hearing"] = {"atSeconds": 60, "due": false}
	if hud.set_social_view(stale_view):
		_failures.append("%s accepted a stale social view replacement" % label)
	var social_snapshot := hud.social_view_snapshot()
	if int(social_snapshot.get("revision", -1)) != 2:
		_failures.append("%s lost the newest social view revision" % label)
	if frame_label != null and frame_label.text != first_hearing_text:
		_failures.append("%s hearing display changed into a countdown" % label)
	var was_paused := paused
	hud.open_log()
	var opened := hud.presentation_snapshot()
	if str(opened.get("modalSurface", "")) != "inspect" or paused != was_paused:
		_failures.append("%s inspect log pauses the world or lacks inspect modal state" % label)
	var normal_text := "%s\n%s" % [
		frame_label.text if frame_label != null else "",
		str((opened.get("log", {}) as Dictionary).get("body", "")),
	]
	for hidden_value in [
		"NPC_Studio_Receptionist",
		"hidden-memory-id",
		"hidden-record-source-memory-id",
		"hidden-question-id",
		"hidden-record-id",
		"hidden-ledger-id",
		"99",
	]:
		if normal_text.contains(hidden_value):
			_failures.append("%s normal social UI leaked raw hidden data: %s" % [label, hidden_value])
	if not normal_text.contains("접수 순서 확인이 보류되었습니다."):
		_failures.append("%s inspect log omitted disclosed run-locale record prose" % label)
	if not normal_text.contains("방문자가 접수 순서를 직접 설명했습니다."):
		_failures.append("%s inspect log omitted disclosed speech source prose" % label)
	if not normal_text.contains("방문 경위가 기록 본문에 남았습니다."):
		_failures.append("%s inspect log omitted disclosed record source prose" % label)
	if not str((opened.get("log", {}) as Dictionary).get("body", "")).contains(
		"접수 기록이 검토 대기 상태입니다."
	):
		_failures.append("%s inspect log omitted the encountered pressure reason" % label)
	hud.close_log()
	if bool(hud.presentation_snapshot().get("debugVisible", true)):
		_failures.append("%s F3 diagnostics are visible by default" % label)


func _check_record_surface_bindings(label: String, town: Node) -> void:
	var layout: Dictionary = town.call("layout_snapshot")
	var expected_record_ids: Dictionary = {}
	for surface_value in layout.get("text_surfaces", []):
		if not surface_value is Dictionary:
			continue
		var surface := surface_value as Dictionary
		if str(surface.get("kind", "")) == "record_surface":
			expected_record_ids[str(surface.get("id", ""))] = true
	if expected_record_ids.size() != 4:
		_failures.append("%s layout does not expose four administrative record surfaces" % label)
	for surface_id_value in expected_record_ids:
		var surface_id := str(surface_id_value)
		var node := town.get_node_or_null("Props/TextSurfaces/%s" % surface_id)
		if node == null or not node.has_method("is_interaction_enabled"):
			_failures.append("%s record surface is not bound: %s" % [label, surface_id])
			continue
		var record_surface := node as StaticBody3D
		if (
			not bool(record_surface.call("is_interaction_enabled"))
			or str(record_surface.call("interaction_kind")) != "record_surface"
			or record_surface.get_collision_layer_value(4) != true
		):
			_failures.append("%s record surface interaction contract drifted: %s" % [label, surface_id])
		if (
			surface_id == "TS_Park_NoticeBoard"
			and (
				not record_surface.is_in_group(&"town_navigation_source")
				or not record_surface.get_collision_layer_value(1)
			)
		):
			_failures.append("%s freestanding park record surface is absent from nav bake" % label)
	var hearing_notice := town.get_node_or_null("Props/TextSurfaces/TS_Station_HearingNotice")
	if (
		hearing_notice == null
		or not hearing_notice.has_method("is_interaction_enabled")
		or bool(hearing_notice.call("is_interaction_enabled"))
	):
		_failures.append("%s hearing notice became a record-surface encounter" % label)


func _check_town_navigation(label: String, instance: Node, region: NavigationRegion3D) -> void:
	var navigation_map := region.get_navigation_map()
	if not navigation_map.is_valid() or NavigationServer3D.map_get_iteration_id(navigation_map) == 0:
		_failures.append("%s navigation map did not synchronize" % label)
		return
	var project_cell_size := float(
		ProjectSettings.get_setting("navigation/3d/default_cell_size", 0.25)
	)
	var project_cell_height := float(
		ProjectSettings.get_setting("navigation/3d/default_cell_height", 0.25)
	)
	if not is_equal_approx(project_cell_size, region.navigation_mesh.cell_size):
		_failures.append(
			"%s navigation map cell size does not match its baked mesh" % label
		)
	if not is_equal_approx(project_cell_height, region.navigation_mesh.cell_height):
		_failures.append(
			"%s navigation map cell height does not match its baked mesh" % label
		)
	var layout: Dictionary = instance.call("layout_snapshot")
	var player_start: Dictionary = layout.get("player_start", {})
	var start := _vector3_from_json(player_start.get("position", []))
	var projected_start := NavigationServer3D.map_get_closest_point(
		navigation_map,
		start
	)
	for vertex in region.navigation_mesh.get_vertices():
		if vertex.y <= 1.0:
			continue
		var elevated_path := NavigationServer3D.map_get_path(
			navigation_map,
			projected_start,
			vertex,
			true
		)
		if (
			elevated_path.size() >= 2
			and elevated_path[elevated_path.size() - 1].distance_to(vertex) <= 0.65
		):
			_failures.append("%s navmesh contains a reachable elevated island" % label)
			break
	var targets := {
		"studio": _anchor_position(layout, "Studio.door_inside"),
		"office": _anchor_position(layout, "Office.door_inside"),
		"station": _anchor_position(layout, "Station.door_inside"),
	}
	for target_name in targets:
		var path := NavigationServer3D.map_get_path(
			navigation_map,
			start,
			targets[target_name],
			true
		)
		if path.size() < 2:
			_failures.append("%s navmesh cannot reach %s interior" % [label, target_name])
		elif path[path.size() - 1].distance_to(targets[target_name]) > 0.65:
			var endpoint := path[path.size() - 1]
			_failures.append(
				"%s navmesh projects %s %.2fm from its interior target (end=%s target=%s)"
				% [
					label,
					target_name,
					endpoint.distance_to(targets[target_name]),
					endpoint,
					targets[target_name],
				]
			)
	_check_semantic_meeting_slots(label, instance, region, layout, start)
	_check_authored_route_paths(label, region, layout)
	_check_actor_spawn_clearance(label, instance, region, layout)


func _check_authored_route_paths(
	label: String,
	region: NavigationRegion3D,
	layout: Dictionary
) -> void:
	var routes_value: Variant = layout.get("routes", [])
	if not routes_value is Array or (routes_value as Array).is_empty():
		_failures.append("%s layout has no authored NPC routes" % label)
		return
	var navigation_map := region.get_navigation_map()
	for route_value in routes_value as Array:
		if not route_value is Dictionary:
			continue
		var route := route_value as Dictionary
		var route_id := str(route.get("id", "unknown"))
		var points_value: Variant = route.get("points", [])
		if not points_value is Array or (points_value as Array).size() < 2:
			_failures.append("%s route %s has fewer than two points" % [label, route_id])
			continue
		var points := points_value as Array
		for point_index in points.size():
			var from_ref := str(points[point_index])
			var to_ref := str(points[(point_index + 1) % points.size()])
			var authored_from := _anchor_position(layout, from_ref)
			var authored_to := _anchor_position(layout, to_ref)
			var projected_from := NavigationServer3D.map_get_closest_point(
				navigation_map,
				authored_from
			)
			var projected_to := NavigationServer3D.map_get_closest_point(
				navigation_map,
				authored_to
			)
			if _planar_distance(projected_from, authored_from) > 0.65:
				_failures.append(
					"%s route %s projects too far from %s"
					% [label, route_id, from_ref]
				)
				continue
			if _planar_distance(projected_to, authored_to) > 0.65:
				_failures.append(
					"%s route %s projects too far from %s"
					% [label, route_id, to_ref]
				)
				continue
			if _planar_distance(projected_from, projected_to) <= 0.05:
				continue
			var path := NavigationServer3D.map_get_path(
				navigation_map,
				projected_from,
				projected_to,
				true
			)
			if (
				path.size() < 2
				or _planar_distance(path[path.size() - 1], projected_to) > 0.65
			):
				_failures.append(
					"%s route %s cannot traverse %s -> %s"
					% [label, route_id, from_ref, to_ref]
				)


func _planar_distance(left: Vector3, right: Vector3) -> float:
	return Vector2(left.x - right.x, left.z - right.z).length()


func _check_actor_spawn_clearance(
	label: String,
	instance: Node,
	region: NavigationRegion3D,
	layout: Dictionary
) -> void:
	var actors_value: Variant = layout.get("actors", [])
	if not actors_value is Array:
		_failures.append("%s layout has no resident spawn definitions" % label)
		return
	var navigation_map := region.get_navigation_map()
	for actor_value in actors_value as Array:
		if not actor_value is Dictionary:
			continue
		var actor := actor_value as Dictionary
		var actor_id := str(actor.get("id", "unknown"))
		var spawn_anchor := str(actor.get("spawn_anchor", ""))
		var authored_spawn := _anchor_position(layout, spawn_anchor)
		var projected_spawn := NavigationServer3D.map_get_closest_point(
			navigation_map,
			authored_spawn
		)
		if _planar_distance(projected_spawn, authored_spawn) > 0.35:
			_failures.append(
				"%s %s spawn is obstructed by baked collision"
				% [label, actor_id]
			)
		var actor_node := instance.get_node_or_null("Actors/%s" % actor_id) as Node3D
		if (
			actor_node == null
			or _planar_distance(actor_node.global_position, authored_spawn) > 0.05
		):
			_failures.append(
				"%s %s did not instantiate at its authored spawn"
				% [label, actor_id]
			)


func _check_player_portal_clearance(label: String, town: Node) -> void:
	var player := town.get_node_or_null("Actors/Player3D") as CharacterBody3D
	if player == null:
		_failures.append("%s has no player for portal-clearance checks" % label)
		return
	var layout: Dictionary = town.call("layout_snapshot")
	var portal_widths: Dictionary = {}
	for portal_value in layout.get("open_portals", []) as Array:
		if portal_value is Dictionary:
			var portal := portal_value as Dictionary
			portal_widths[str(portal.get("id", ""))] = float(portal.get("width", 0.0))
	for portal_id in [
		"PORTAL_STUDIO_FRONT",
		"PORTAL_OFFICE_FRONT",
		"PORTAL_STATION_FRONT",
	]:
		if float(portal_widths.get(portal_id, 0.0)) < 2.4:
			_failures.append("%s %s is narrower than the 2.4m open-portal contract" % [label, portal_id])

	var original_transform := player.global_transform
	var original_velocity := player.velocity
	var original_control := bool(player.get("_control_enabled"))
	player.call("set_control_enabled", false)
	var crossings := [
		{
			"id": "Studio",
			"outside": Vector3(0.0, 0.05, -11.0),
			"inward": Vector3(0.0, 0.0, -2.0),
			"lateral": Vector3(1.0, 0.0, 0.0),
		},
		{
			"id": "Office",
			"outside": Vector3(-11.0, 0.05, 0.0),
			"inward": Vector3(-2.0, 0.0, 0.0),
			"lateral": Vector3(0.0, 0.0, 1.0),
		},
		{
			"id": "Station",
			"outside": Vector3(11.0, 0.05, 0.0),
			"inward": Vector3(2.0, 0.0, 0.0),
			"lateral": Vector3(0.0, 0.0, 1.0),
		},
	]
	for crossing_value in crossings:
		var crossing := crossing_value as Dictionary
		for lateral_sign in [-1.0, 1.0]:
			var outside := crossing["outside"] as Vector3
			var lateral := crossing["lateral"] as Vector3
			var start: Vector3 = outside + lateral * 0.65 * lateral_sign
			var inward: Vector3 = crossing["inward"] as Vector3
			player.global_position = start
			player.velocity = Vector3.ZERO
			await physics_frame
			var inward_collision := player.move_and_collide(inward)
			if inward_collision != null or _planar_distance(player.global_position, start + inward) > 0.05:
				_failures.append(
					"%s player capsule cannot enter %s portal at lateral offset %.2f"
					% [label, str(crossing["id"]), 0.65 * lateral_sign]
				)
				continue
			var outward_collision := player.move_and_collide(-inward)
			if outward_collision != null or _planar_distance(player.global_position, start) > 0.05:
				_failures.append(
					"%s player capsule cannot exit %s portal at lateral offset %.2f"
					% [label, str(crossing["id"]), 0.65 * lateral_sign]
				)
	player.global_transform = original_transform
	player.velocity = original_velocity
	player.call("set_control_enabled", original_control)


func _check_npc_spatial_facts(label: String, instance: Node) -> void:
	if not instance.has_method("npc_spatial_facts"):
		_failures.append("%s exposes no engine-derived NPC spatial facts" % label)
		return
	var facts_value: Variant = instance.call("npc_spatial_facts")
	if not facts_value is Array or (facts_value as Array).size() != 6:
		_failures.append("%s spatial packet does not contain exactly six residents" % label)
		return
	var facts := facts_value as Array
	if not instance.has_method("spatial_facts"):
		_failures.append("%s exposes no player-aware spatial packet" % label)
		return
	var spatial_packet: Dictionary = instance.call("spatial_facts")
	var player_fact: Dictionary = spatial_packet.get("player", {})
	if (
		not player_fact.get("position", null) is Array
		or (player_fact.get("position", []) as Array).size() != 3
		or typeof(player_fact.get("locationId", "")) != TYPE_STRING
	):
		_failures.append("%s player spatial fact is incomplete" % label)
	var by_actor: Dictionary = {}
	var ordered_actor_ids: Array[String] = []
	var canonical_prop_ids := _canonical_physical_prop_ids(instance)
	if canonical_prop_ids.size() != 3:
		_failures.append(
			"%s canonical physical prop registry has %d entries instead of 3"
			% [label, canonical_prop_ids.size()]
		)
	for fact_value in facts:
		if not fact_value is Dictionary:
			_failures.append("%s spatial packet contains a non-dictionary fact" % label)
			continue
		var fact := fact_value as Dictionary
		var actor_id := str(fact.get("actorId", ""))
		ordered_actor_ids.append(actor_id)
		by_actor[actor_id] = fact
		var position_value: Variant = fact.get("position", [])
		if not position_value is Array or (position_value as Array).size() != 3:
			_failures.append("%s %s spatial position is not a 3D tuple" % [label, actor_id])
		for key in [
			"reachableAnchorRefs",
			"visibleActorIds",
			"audibleActorIds",
			"visibleObjectIds",
		]:
			var ids_value: Variant = fact.get(key, null)
			if not ids_value is Array:
				_failures.append("%s %s spatial %s is not an array" % [label, actor_id, key])
				continue
			var ids := ids_value as Array
			var normalized: Array[String] = []
			for id_value in ids:
				normalized.append(str(id_value))
			var sorted_unique := normalized.duplicate()
			sorted_unique.sort()
			sorted_unique = _dedupe_strings(sorted_unique)
			if normalized != sorted_unique:
				_failures.append("%s %s spatial %s is not sorted/deduped" % [label, actor_id, key])
		if not (fact.get("reachableAnchorRefs", []) as Array).has("Park.center"):
			_failures.append("%s %s cannot reach the connected town NavMesh" % [label, actor_id])
		var reported_object_ids: Array[String] = []
		for id_value in fact.get("visibleObjectIds", []) as Array:
			reported_object_ids.append(str(id_value))
		for prop_id in reported_object_ids:
			if not canonical_prop_ids.has(prop_id):
				_failures.append("%s %s reported unknown visible prop %s" % [label, actor_id, prop_id])
		var actor_node := instance.get_node_or_null("Actors/%s" % actor_id) as Node3D
		var expected_object_ids := _expected_visible_physical_prop_ids(
			instance,
			actor_node,
			canonical_prop_ids
		)
		if reported_object_ids != expected_object_ids:
			_failures.append(
				"%s %s visible props drifted: got=%s expected=%s"
				% [label, actor_id, reported_object_ids, expected_object_ids]
			)
		for boolean_key in ["playerVisible", "playerAudible", "playerReachable"]:
			if typeof(fact.get(boolean_key, null)) != TYPE_BOOL:
				_failures.append(
					"%s %s spatial %s is not boolean" % [label, actor_id, boolean_key]
				)
		var zone_value: Variant = fact.get("playerInteractionZoneId", null)
		if zone_value != null and typeof(zone_value) != TYPE_STRING:
			_failures.append("%s %s player conversation zone is invalid" % [label, actor_id])
	var sorted_actor_ids := ordered_actor_ids.duplicate()
	sorted_actor_ids.sort()
	if ordered_actor_ids != sorted_actor_ids or by_actor.size() != 6:
		_failures.append("%s spatial residents are not unique and deterministically ordered" % label)
	var caretaker := by_actor.get("NPC_Park_Caretaker", {}) as Dictionary
	var liaison := by_actor.get("NPC_Roaming_Liaison", {}) as Dictionary
	if (
		not (caretaker.get("visibleActorIds", []) as Array).has("NPC_Roaming_Liaison")
		or not (liaison.get("visibleActorIds", []) as Array).has("NPC_Park_Caretaker")
	):
		_failures.append("%s engine LOS did not connect the unobstructed park residents" % label)
	if (
		not (caretaker.get("audibleActorIds", []) as Array).has("NPC_Roaming_Liaison")
		or not (liaison.get("audibleActorIds", []) as Array).has("NPC_Park_Caretaker")
	):
		_failures.append("%s authored park audibility did not connect nearby residents" % label)
	if (
		not bool(caretaker.get("playerReachable", false))
		or str(caretaker.get("playerInteractionZoneId", "")) != "ParkConversation"
	):
		_failures.append("%s player contact facts ignored Park nav/radius/role bindings" % label)
	for remote_actor_id in [
		"NPC_Studio_Receptionist",
		"NPC_Studio_Manager",
		"NPC_Office_Worker",
		"NPC_Station_Officer",
	]:
		var remote_fact := by_actor.get(remote_actor_id, {}) as Dictionary
		if remote_fact.get("playerInteractionZoneId", null) != null:
			_failures.append(
				"%s remote %s inherited the player's Park interaction zone"
				% [label, remote_actor_id]
			)
	await _check_studio_record_conversation_facts(label, instance)
	await _check_record_surface_los_overlay(label, instance)
	_check_held_prop_visibility(label, instance)


func _check_studio_record_conversation_facts(label: String, town: Node) -> void:
	var manager := town.get_node_or_null("Actors/NPC_Studio_Manager") as Node3D
	var player := town.get_node_or_null("Actors/Player3D") as Node3D
	if manager == null or player == null:
		_failures.append("%s cannot stage Studio conversation facts" % label)
		return
	var manager_transform := manager.global_transform
	var player_transform := player.global_transform
	var manager_physics := manager.is_physics_processing()
	var player_physics := player.is_physics_processing()
	manager.set_physics_process(false)
	player.set_physics_process(false)
	manager.global_position = Vector3(3.3, 0.05, -17.45)
	player.global_position = Vector3(2.1, 0.05, -19.49)
	await physics_frame
	await physics_frame
	var packet: Dictionary = town.call("spatial_facts")
	var manager_fact: Dictionary = {}
	for fact_value in packet.get("actors", []) as Array:
		if (
			fact_value is Dictionary
			and str((fact_value as Dictionary).get("actorId", ""))
			== "NPC_Studio_Manager"
		):
			manager_fact = fact_value as Dictionary
			break
	if (
		manager_fact.is_empty()
		or not bool(manager_fact.get("playerVisible", false))
		or not bool(manager_fact.get("playerAudible", false))
		or not bool(manager_fact.get("playerReachable", false))
		or str(manager_fact.get("playerInteractionZoneId", ""))
		!= "StudioManagerConversation"
	):
		_failures.append(
			"%s Studio record conversation facts are not grounded: %s"
			% [label, JSON.stringify(manager_fact)]
		)
	manager.global_transform = manager_transform
	player.global_transform = player_transform
	manager.set_physics_process(manager_physics)
	player.set_physics_process(player_physics)
	await physics_frame


func _check_record_surface_los_overlay(label: String, town: Node) -> void:
	var surface := town.get_node_or_null(
		"Props/TextSurfaces/TS_Studio_ReviewRecords"
	) as CollisionObject3D
	if surface == null:
		_failures.append("%s cannot stage record-overlay spatial LOS" % label)
		return
	var surface_transform := surface.global_transform
	surface.global_position = Vector3(0.0, 50.0, 0.0)
	var board_center := surface.global_position
	var board_normal := surface.global_transform.basis.z.normalized()
	var source := Node3D.new()
	var target := StaticBody3D.new()
	var target_shape := CollisionShape3D.new()
	var target_box := BoxShape3D.new()
	target_box.size = Vector3(0.6, 0.6, 0.6)
	target_shape.position = Vector3.UP * 1.35
	target_shape.shape = target_box
	target.add_child(target_shape)
	town.add_child(source)
	town.add_child(target)
	source.global_position = board_center - board_normal - Vector3.UP * 1.35
	target.global_position = board_center + board_normal - Vector3.UP * 1.35
	await physics_frame
	var space_state := (town as Node3D).get_world_3d().direct_space_state
	var source_eye := source.global_position + Vector3.UP * 1.35
	var target_eye := target.global_position + Vector3.UP * 1.35
	var raw_query := PhysicsRayQueryParameters3D.create(source_eye, target_eye)
	raw_query.collide_with_areas = false
	raw_query.collide_with_bodies = true
	var raw_hit := space_state.intersect_ray(raw_query)
	var raw_collider: Variant = raw_hit.get("collider")
	if not raw_collider is Node or not _smoke_node_belongs_to(
		raw_collider as Node,
		surface
	):
		_failures.append("%s record-overlay proof did not block the raw sight ray" % label)
	elif not bool(town.call(
		"_nodes_have_line_of_sight",
		source,
		target,
		space_state
	)):
		_failures.append("%s record surface hid a resident from spatial LOS" % label)
	surface.global_transform = surface_transform
	source.queue_free()
	target.queue_free()
	await physics_frame


func _canonical_physical_prop_ids(town: Node) -> Array[String]:
	var ids: Array[String] = []
	var layout: Dictionary = town.call("layout_snapshot")
	for prop_value in layout.get("physical_props", []):
		if not prop_value is Dictionary:
			continue
		var prop_id := str((prop_value as Dictionary).get("id", ""))
		var node := town.get_node_or_null("Props/PhysicalProps3D/%s" % prop_id)
		if node != null and str(node.get("prop_id")) == prop_id:
			ids.append(prop_id)
	ids.sort()
	return ids


func _expected_visible_physical_prop_ids(
	town: Node,
	observer: Node3D,
	prop_ids: Array[String]
) -> Array[String]:
	var visible_ids: Array[String] = []
	if observer == null:
		return visible_ids
	var space_state := (town as Node3D).get_world_3d().direct_space_state
	var origin := observer.global_position + Vector3.UP * 1.35
	for prop_id in prop_ids:
		var prop := town.get_node_or_null("Props/PhysicalProps3D/%s" % prop_id) as Node3D
		if prop == null or origin.distance_to(prop.global_position) > 12.0:
			continue
		var carrier: Node3D = null
		if prop.has_method(&"held_by"):
			var carrier_value: Variant = prop.call(&"held_by")
			if carrier_value is Node3D:
				carrier = carrier_value as Node3D
		var query := PhysicsRayQueryParameters3D.create(origin, prop.global_position)
		query.collision_mask = 23
		query.collide_with_areas = false
		query.collide_with_bodies = true
		if observer is CollisionObject3D:
			query.exclude = [(observer as CollisionObject3D).get_rid()]
		var hit := space_state.intersect_ray(query)
		if hit.is_empty():
			if carrier != null:
				visible_ids.append(prop_id)
			continue
		var collider_value: Variant = hit.get("collider")
		if (
			collider_value is Node
			and (
				_smoke_node_belongs_to(collider_value as Node, prop)
				or (
					carrier != null
					and _smoke_node_belongs_to(collider_value as Node, carrier)
				)
			)
		):
			visible_ids.append(prop_id)
	visible_ids.sort()
	return visible_ids


func _check_held_prop_visibility(label: String, town: Node) -> void:
	var caretaker := town.get_node_or_null("Actors/NPC_Park_Caretaker") as Node3D
	var player := town.get_node_or_null("Actors/Player3D") as Node3D
	var prop := town.get_node_or_null("Props/PhysicalProps3D/Prop_Park_Box") as RigidBody3D
	if caretaker == null or player == null or prop == null:
		_failures.append("%s cannot stage held-prop visibility" % label)
		return
	if not prop.has_method(&"begin_carry") or not bool(prop.call(&"begin_carry", player)):
		_failures.append("%s could not enter held-prop visibility state" % label)
		return
	prop.call("update_carried_position", player.global_position + Vector3.UP * 1.1)
	var held_facts: Array = town.call("npc_spatial_facts")
	var caretaker_fact: Dictionary = {}
	for fact_value in held_facts:
		if (
			fact_value is Dictionary
			and str((fact_value as Dictionary).get("actorId", "")) == "NPC_Park_Caretaker"
		):
			caretaker_fact = fact_value as Dictionary
			break
	if not (caretaker_fact.get("visibleObjectIds", []) as Array).has("Prop_Park_Box"):
		_failures.append("%s held prop was hidden when its carrier was the ray hit" % label)
	prop.call("reset_to_spawn")
	prop.sleeping = true


func _smoke_node_belongs_to(node: Node, owner_node: Node) -> bool:
	var current: Node = node
	while current != null:
		if current == owner_node:
			return true
		current = current.get_parent()
	return false


func _dedupe_strings(values: Array[String]) -> Array[String]:
	var deduped: Array[String] = []
	for value in values:
		if deduped.is_empty() or deduped[deduped.size() - 1] != value:
			deduped.append(value)
	return deduped


func _check_physical_prop_startup_stability(label: String, town: Node) -> void:
	var keyboard := town.get_node_or_null(
		"Props/PhysicalProps3D/Prop_Studio_Keyboard"
	) as RigidBody3D
	if keyboard == null:
		_failures.append("%s has no Studio keyboard prop" % label)
		return
	var expected_position := Vector3(-2.25, 0.86, -15.6)
	if keyboard.position.distance_to(expected_position) > 0.04:
		_failures.append(
			"%s Studio keyboard fell from its desk: got=%s expected=%s"
			% [label, keyboard.position, expected_position]
		)
	if keyboard.global_transform.basis.y.normalized().dot(Vector3.UP) < 0.98:
		_failures.append("%s Studio keyboard tipped during startup settle" % label)
	if keyboard.linear_velocity.length() > 0.2:
		_failures.append("%s Studio keyboard did not settle on its desk" % label)


func _check_semantic_meeting_slots(
	label: String,
	instance: Node,
	region: NavigationRegion3D,
	layout: Dictionary,
	start: Vector3
) -> void:
	var schedule_value: Variant = layout.get("schedule", {})
	if not schedule_value is Dictionary:
		_failures.append("%s layout has no semantic schedule" % label)
		return
	var meeting_windows_value: Variant = (schedule_value as Dictionary).get(
		"meeting_windows",
		[]
	)
	if not meeting_windows_value is Array or (meeting_windows_value as Array).is_empty():
		_failures.append("%s layout has no semantic meeting windows" % label)
		return
	var navigation_map := region.get_navigation_map()
	var public_speech_distance := 0.0
	for volume_value in layout.get("audibility_volumes", []) as Array:
		if (
			volume_value is Dictionary
			and str((volume_value as Dictionary).get("id", "")) == "AUD_PUBLIC_CENTER"
		):
			public_speech_distance = float(
				(volume_value as Dictionary).get("max_speech_distance_m", 0.0)
			)
			break
	if public_speech_distance <= 0.0:
		_failures.append("%s layout has no public-center speech distance" % label)
	var meeting_windows := meeting_windows_value as Array
	var first_meeting_index := 0
	var first_meeting_start := INF
	for candidate_index in meeting_windows.size():
		var candidate_value: Variant = meeting_windows[candidate_index]
		if not candidate_value is Dictionary:
			continue
		var candidate_start := float(
			(candidate_value as Dictionary).get("start_world_seconds", INF)
		)
		if candidate_start < first_meeting_start:
			first_meeting_start = candidate_start
			first_meeting_index = candidate_index
	for meeting_index in meeting_windows.size():
		var meeting_value: Variant = meeting_windows[meeting_index]
		if not meeting_value is Dictionary:
			continue
		var meeting := meeting_value as Dictionary
		var meeting_id := str(meeting.get("id", "unknown"))
		var participant_refs_value: Variant = meeting.get("participant_anchor_refs", {})
		if not participant_refs_value is Dictionary:
			_failures.append("%s meeting %s has no participant slots" % [label, meeting_id])
			continue
		var projected_slots: Array[Vector3] = []
		for anchor_ref_value in (participant_refs_value as Dictionary).values():
			var anchor_ref := str(anchor_ref_value)
			var authored_position := _anchor_position(layout, anchor_ref)
			if (
				meeting_index == first_meeting_index
				and start.distance_to(authored_position) > public_speech_distance
			):
				_failures.append(
					"%s first meeting is not audible from player spawn: %s %.2fm > %.2fm"
					% [
						label,
						anchor_ref,
						start.distance_to(authored_position),
						public_speech_distance,
					]
				)
			var projected_value: Variant = instance.call("navigation_position", anchor_ref)
			if not projected_value is Vector3:
				_failures.append(
					"%s meeting %s slot is not navmesh-bound: %s"
					% [label, meeting_id, anchor_ref]
				)
				continue
			var projected := projected_value as Vector3
			projected_slots.append(projected)
			if projected.distance_to(authored_position) > 0.65:
				_failures.append(
					"%s meeting %s slot projects too far from its authored anchor: %s"
					% [label, meeting_id, anchor_ref]
				)
			var path := NavigationServer3D.map_get_path(
				navigation_map,
				start,
				projected,
				true
			)
			if path.size() < 2 or path[path.size() - 1].distance_to(projected) > 0.65:
				_failures.append(
					"%s meeting %s slot is unreachable: %s"
					% [label, meeting_id, anchor_ref]
				)
		for left_index in projected_slots.size():
			for right_index in range(left_index + 1, projected_slots.size()):
				var planar_separation := Vector2(
					projected_slots[left_index].x - projected_slots[right_index].x,
					projected_slots[left_index].z - projected_slots[right_index].z
				).length()
				if planar_separation < 0.75:
					_failures.append(
						"%s meeting %s participant slots collapse together"
						% [label, meeting_id]
					)


func _check_town_location_coverage(label: String, instance: Node) -> void:
	var player := instance.get_node_or_null("Actors/Player3D") as Node3D
	if player == null or not instance.has_method("current_location_id"):
		return
	var original_transform := player.global_transform
	var samples := {
		"park": {"position": Vector3(0, 0.05, -6.9), "location": "Park"},
		"studio_path": {"position": Vector3(0, 0.05, -8), "location": "Park"},
		"studio_threshold": {"position": Vector3(0, 0.05, -12.1), "location": "Park"},
		"studio_inside": {"position": Vector3(0, 0.05, -12.3), "location": "Studio"},
		"office_threshold": {"position": Vector3(-12.1, 0.05, 0), "location": "Park"},
		"office_inside": {"position": Vector3(-12.3, 0.05, 0), "location": "Office"},
		"station_threshold": {"position": Vector3(12.1, 0.05, 0), "location": "Park"},
		"station_inside": {"position": Vector3(12.3, 0.05, 0), "location": "Station"},
	}
	for sample_name in samples:
		var sample: Dictionary = samples[sample_name]
		player.global_position = sample.get("position", Vector3.ZERO)
		var location_id := str(instance.call("current_location_id"))
		if location_id != str(sample.get("location", "")):
			_failures.append(
				"%s location coverage failed at %s: %s"
				% [label, sample_name, location_id]
			)
	player.global_transform = original_transform


func _check_respawn_anchor_contract(label: String, instance: Node) -> void:
	if not instance.has_method("nearest_anchor_position"):
		_failures.append("%s exposes no nearest safe respawn anchor" % label)
		return
	var layout: Dictionary = instance.call("layout_snapshot")
	var safe_positions: Array[Vector3] = []
	for anchor_ref_value in layout.get("player_respawn_anchor_refs", []):
		safe_positions.append(_anchor_position(layout, str(anchor_ref_value)))
	if safe_positions.is_empty():
		_failures.append("%s has no player-safe respawn anchors" % label)
		return
	var probes := [
		Vector3(-2, -20, -15),
		Vector3(-4, -20, 2),
		Vector3(4.5, -20, -18.5),
	]
	for probe in probes:
		var candidate: Vector3 = instance.call("nearest_anchor_position", probe)
		var candidate_is_safe := false
		for safe_position in safe_positions:
			if candidate.distance_to(safe_position) <= 0.01:
				candidate_is_safe = true
				break
		if not candidate_is_safe:
			_failures.append("%s selected an unsafe player respawn anchor: %s" % [label, candidate])


func _check_npc_movement(label: String, instance: Node) -> void:
	var manager := instance.get_node_or_null("Actors/NPC_Studio_Manager") as NPC3D
	var caretaker := instance.get_node_or_null("Actors/NPC_Park_Caretaker") as NPC3D
	if manager == null or caretaker == null:
		_failures.append("%s has no manager/caretaker movement proof" % label)
		return
	var manager_anchor := "Park.meeting_north_west"
	var caretaker_anchor := "Park.meeting_north_east"
	var manager_target_value: Variant = instance.call("navigation_position", manager_anchor)
	var caretaker_target_value: Variant = instance.call("navigation_position", caretaker_anchor)
	if not manager_target_value is Vector3 or not caretaker_target_value is Vector3:
		_failures.append("%s cannot project the first meeting's participant slots" % label)
		return
	var manager_target := manager_target_value as Vector3
	var caretaker_target := caretaker_target_value as Vector3
	var manager_start := manager.global_position
	var caretaker_start := caretaker.global_position
	var arrivals: Dictionary = {}
	var blocks: Array[Dictionary] = []
	var record_arrival := func(
		movement_id: String,
		actor_id: StringName,
		anchor_ref: String
	) -> void:
		arrivals[str(actor_id)] = {
			"movementId": movement_id,
			"anchorRef": anchor_ref,
		}
	var record_block := func(
		movement_id: String,
		actor_id: StringName,
		anchor_ref: String,
		reason: String
	) -> void:
		blocks.append({
			"movementId": movement_id,
			"actorId": str(actor_id),
			"anchorRef": anchor_ref,
			"reason": reason,
		})
	manager.movement_arrived.connect(record_arrival)
	caretaker.movement_arrived.connect(record_arrival)
	manager.movement_blocked.connect(record_block)
	caretaker.movement_blocked.connect(record_block)
	manager.apply_movement_command("smoke-manager-meeting", manager_anchor, manager_target)
	caretaker.apply_movement_command(
		"smoke-caretaker-meeting",
		caretaker_anchor,
		caretaker_target
	)
	var convergence_frames := 540
	for _frame in range(convergence_frames):
		await physics_frame
		if arrivals.size() == 2 or not blocks.is_empty():
			break
	var manager_position_before_stop := manager.global_position
	var caretaker_position_before_stop := caretaker.global_position
	var manager_status_before_stop := manager.movement_status()
	var caretaker_status_before_stop := caretaker.movement_status()
	if manager.movement_arrived.is_connected(record_arrival):
		manager.movement_arrived.disconnect(record_arrival)
	if caretaker.movement_arrived.is_connected(record_arrival):
		caretaker.movement_arrived.disconnect(record_arrival)
	if manager.movement_blocked.is_connected(record_block):
		manager.movement_blocked.disconnect(record_block)
	if caretaker.movement_blocked.is_connected(record_block):
		caretaker.movement_blocked.disconnect(record_block)
	manager.stop()
	caretaker.stop()
	if not blocks.is_empty():
		_failures.append("%s meeting movement was blocked: %s" % [label, blocks])
		return
	if not arrivals.has("NPC_Studio_Manager") or not arrivals.has("NPC_Park_Caretaker"):
		_failures.append(
			(
				"%s manager/caretaker did not converge in %d physics frames "
				+ "(arrivals=%s manager=%s caretaker=%s)"
			)
			% [
				label,
				convergence_frames,
				arrivals,
				{
					"position": manager_position_before_stop,
					"status": manager_status_before_stop,
				},
				{
					"position": caretaker_position_before_stop,
					"status": caretaker_status_before_stop,
				},
			]
		)
		return
	if str((arrivals["NPC_Studio_Manager"] as Dictionary).get("anchorRef", "")) != manager_anchor:
		_failures.append("%s manager arrived at the wrong semantic meeting slot" % label)
	if str((arrivals["NPC_Park_Caretaker"] as Dictionary).get("anchorRef", "")) != caretaker_anchor:
		_failures.append("%s caretaker arrived at the wrong semantic meeting slot" % label)
	var manager_progress := Vector2(
		manager.global_position.x - manager_start.x,
		manager.global_position.z - manager_start.z
	).length()
	var caretaker_progress := Vector2(
		caretaker.global_position.x - caretaker_start.x,
		caretaker.global_position.z - caretaker_start.z
	).length()
	if manager_progress < 0.25 or caretaker_progress < 0.25:
		_failures.append("%s meeting convergence made no readable physical progress" % label)
	var slot_separation := Vector2(
		manager.global_position.x - caretaker.global_position.x,
		manager.global_position.z - caretaker.global_position.z
	).length()
	if slot_separation < 0.75:
		_failures.append("%s physical meeting participants collapsed into one slot" % label)


func _check_player_contact(label: String, instance: Node) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s contact smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var receptionist := instance.get_node_or_null(
		"Town/Actors/NPC_Studio_Receptionist"
	) as NPC3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	var fixture := _load_run_fixture()
	var endpoints: Dictionary = fixture.get("endpoints", {})
	var contact_packet: Dictionary = endpoints.get("npcDecisionPlayerContact", {})
	var contact_response: Dictionary = contact_packet.get("response", {})
	var contact_value: Variant = contact_response.get("activeContact")
	var second_contact: Dictionary = (
		(contact_value as Dictionary).duplicate(true)
		if contact_value is Dictionary
		else {}
	)
	var contact_actor_id := str(second_contact.get("actorId", ""))
	var contact_actor := instance.get_node_or_null(
		"Town/Actors/%s" % contact_actor_id
	) as NPC3D
	if (
		player == null
		or receptionist == null
		or contact_actor == null
		or hud == null
		or second_contact.is_empty()
	):
		_failures.append("%s contact smoke is missing player/resident/HUD" % label)
		return
	var ready := false
	for _frame in range(300):
		await process_frame
		ready = receptionist.is_interaction_enabled()
		if ready:
			break
	if not ready:
		_failures.append("%s contact actor never obtained a preloaded opening" % label)
		return
	# Isolate the contact race from unrelated fixture advance/ambient packets;
	# otherwise a late backend-authored activeContact:null can correctly clear
	# the manually injected contact while this focused proof is running.
	instance.set("_fixture_replay_complete", true)
	instance.set("_ambient_decision_halted_reason", "contact_smoke_isolation")
	instance.set("_ambient_pending_request", {})
	for _frame in range(300):
		if (
			not bool(instance.get("_advance_in_flight"))
			and not bool(instance.get("_advance_rebase_in_flight"))
			and not bool(instance.get("_ambient_decision_in_flight"))
		):
			break
		await process_frame
	# These contacts are deliberately synthetic and do not exist inside the
	# fixture adapter. Discard only a leftover preload-rebase request after every
	# real lane above has settled, or the now-correct authoritative null snapshot
	# would revoke the setup before its movement/contact assertions run.
	instance.set("_conversation_preload_refresh_required", false)
	instance.set("_advance_needs_rebase", false)
	instance.call("_sync_active_contact_from_response", {"activeContact": null})
	var run_snapshot: Dictionary = instance.call("presentation_snapshot")
	var elapsed := float((run_snapshot.get("worldClock", {}) as Dictionary).get(
		"elapsedSeconds",
		0.0
	))
	var first_contact := {
		"contactId": "contact-smoke-cancel",
		"actorId": str(receptionist.actor_id),
		"interactionZoneId": "StudioReceptionConversation",
		"originAnchorRef": "Studio.receptionist_spawn",
		"safeDistanceM": 1.6,
		"issuedAtSeconds": elapsed,
		"expiresAtSeconds": elapsed + 60.0,
		"reason": "smoke_internal_reason",
		"procedure": "ordinary",
	}
	player.global_position = receptionist.global_position + Vector3(0.0, 0.0, 3.6)
	player.velocity = Vector3.ZERO
	instance.call("_sync_active_contact_from_response", {"activeContact": first_contact})
	# A same-revision response that began before this contact cannot revoke it.
	# Real RunService contact changes always advance the world revision.
	instance.call("_sync_active_contact_from_response", {
		"worldRevision": int(run_snapshot.get("runWorldRevision", 0)),
		"activeContact": null,
	})
	if str((instance.get("_active_contact") as Dictionary).get("contactId", "")) != str(
		first_contact.get("contactId", "")
	):
		_failures.append("%s equal-revision ordinary response cleared a newer contact" % label)
	var conflict_arrival_count: Array[int] = [0]
	var record_conflict_arrival := func(
		_movement_id: String,
		_actor_id: StringName,
		_anchor_ref: String
	) -> void:
		conflict_arrival_count[0] += 1
	var stale_movement := {
		"movementId": "movement-smoke-contact-stale",
		"actorId": str(receptionist.actor_id),
		"fromAnchorRef": "Studio.receptionist_spawn",
		"targetAnchorRef": "Studio.waiting_seats",
		"scheduleBlockId": "schedule-smoke-stale",
		"activity": "wait",
	}
	var current_movement := {
		"movementId": "movement-smoke-contact-current",
		"actorId": str(receptionist.actor_id),
		"fromAnchorRef": "Studio.receptionist_spawn",
		"targetAnchorRef": "Studio.reception_desk",
		"scheduleBlockId": "schedule-smoke-current",
		"activity": "work",
	}
	var authoritative_scheduler := {
		"actors": [{
			"actorId": str(receptionist.actor_id),
			"confirmedAnchorRef": "Studio.receptionist_spawn",
			"currentBlock": {"activity": "work"},
			"pendingMovement": current_movement,
		}],
	}
	receptionist.movement_arrived.connect(record_conflict_arrival)
	instance.call("_queue_or_apply_movement", stale_movement)
	instance.call("_reconcile_scheduler_movements", authoritative_scheduler)
	# Closing an unrelated modal flushes delayed movement through the same
	# contact guard; it must simply requeue while the order is still active.
	instance.set("_conversation_target", receptionist)
	var synthetic_contact_run_id := str(instance.get("_run_id"))
	# No backend fixture owns this synthetic contact. Keep the run id unavailable
	# until deferred modal cleanup has drained, so an unrelated snapshot cannot
	# correctly replace the setup with the fixture's authoritative null.
	instance.set("_run_id", "")
	paused = true
	instance.call("_finish_conversation_modal")
	for _frame in range(4):
		await physics_frame
	instance.set("_run_id", synthetic_contact_run_id)
	var protected_contact: Dictionary = instance.call("presentation_snapshot").get(
		"contact",
		{}
	)
	if (
		not bool(protected_contact.get("active", false))
		or not receptionist.has_player_contact("contact-smoke-cancel")
		or not str(receptionist.movement_status().get("movementId", "")).is_empty()
		or conflict_arrival_count[0] != 0
	):
		_failures.append(
			"%s conflicting movement locally cancelled contact or forged arrival: %s"
			% [
				label,
				{
					"contact": protected_contact,
					"actorContact": receptionist.contact_status(),
					"movement": receptionist.movement_status(),
					"arrivalCount": conflict_arrival_count[0],
					"runStatus": instance.get("_run_status"),
					"queued": instance.get("_queued_movement_deltas"),
				},
			]
		)
	if receptionist.movement_arrived.is_connected(record_conflict_arrival):
		receptionist.movement_arrived.disconnect(record_conflict_arrival)
	instance.call("_sync_active_contact_from_response", {"activeContact": null})
	instance.call("_reconcile_scheduler_movements", authoritative_scheduler)
	await physics_frame
	var resumed_movement := receptionist.movement_status()
	if (
		receptionist.has_player_contact()
		or str(resumed_movement.get("movementId", ""))
		!= "movement-smoke-contact-current"
	):
		_failures.append(
			"%s authoritative scheduler movement did not resume after contact cleared"
			% label
		)
	instance.call("_drop_client_movement_for_actor", str(receptionist.actor_id))
	receptionist.stop()
	instance.call("_sync_active_contact_from_response", {"activeContact": first_contact})
	hud.open_settings()
	for _frame in range(8):
		await physics_frame
	var first_follow := receptionist.contact_status()
	var first_retarget_count := int(first_follow.get("retargetCount", 0))
	player.global_position += Vector3(0.75, 0.0, 0.0)
	for _frame in range(24):
		await physics_frame
	var moved_follow := receptionist.contact_status()
	var moved_retarget_count := int(moved_follow.get("retargetCount", 0))
	if (
		first_retarget_count < 1
		or moved_retarget_count <= first_retarget_count
		or moved_retarget_count > first_retarget_count + 3
	):
		_failures.append(
			"%s contact target refresh was missing or unbounded: %s -> %s"
			% [label, first_retarget_count, moved_retarget_count]
		)
	for contact_offset in [
		Vector3(0.0, 0.0, 1.5),
		Vector3(1.5, 0.0, 0.0),
		Vector3(-1.5, 0.0, 0.0),
		Vector3(0.0, 0.0, -1.5),
	]:
		player.global_position = receptionist.global_position + contact_offset
		player.velocity = Vector3.ZERO
		await physics_frame
		if bool(receptionist.call("_contact_has_line_of_sight")):
			break
	for _frame in range(30):
		await physics_frame
		if str(instance.get("_pending_contact_ready_id")) == "contact-smoke-cancel":
			break
	var deferred_settings := hud.presentation_snapshot()
	if (
		paused
		or str(deferred_settings.get("modalSurface", "")) != "settings"
		or str(instance.get("_pending_contact_ready_id")) != "contact-smoke-cancel"
	):
		_failures.append(
			"%s settings did not defer a ready contact while world time ran: %s"
			% [
				label,
				{
					"paused": paused,
					"modal": deferred_settings.get("modalSurface", ""),
					"pending": instance.get("_pending_contact_ready_id"),
					"follow": receptionist.contact_status(),
					"los": receptionist.call("_contact_has_line_of_sight"),
					"distance": receptionist.global_position.distance_to(
						player.global_position
					),
				},
			]
		)
	var fake_arrival_count: Array[int] = [0]
	var record_fake_arrival := func(
		_movement_id: String,
		_actor_id: StringName,
		_anchor_ref: String
	) -> void:
		fake_arrival_count[0] += 1
	receptionist.movement_arrived.connect(record_fake_arrival)
	instance.call("_sync_active_contact_from_response", {"activeContact": null})
	hud.close_settings()
	for _frame in range(180):
		await physics_frame
		if not receptionist.is_moving():
			break
	if receptionist.movement_arrived.is_connected(record_fake_arrival):
		receptionist.movement_arrived.disconnect(record_fake_arrival)
	if (
		str(hud.presentation_snapshot().get("modalSurface", "")) == "conversation"
		or not str(instance.get("_pending_contact_ready_id")).is_empty()
		or fake_arrival_count[0] != 0
		or not str(receptionist.movement_status().get("movementId", "")).is_empty()
	):
		_failures.append("%s stale contact opened or cancel-return forged runtime arrival" % label)

	var consumed_contact_id := str(second_contact.get("contactId", ""))
	player.global_position = contact_actor.global_position + Vector3(0.0, 0.0, 3.4)
	player.velocity = Vector3.ZERO
	instance.call("_sync_active_contact_from_response", {"activeContact": second_contact})
	var cue := hud.contact_cue_snapshot()
	if (
		not bool(cue.get("visible", false))
		or str(cue.get("text", "")).is_empty()
		or str(cue.get("text", "")).contains("contact-smoke")
		or str(cue.get("text", "")).contains("smoke_internal_reason")
	):
		_failures.append("%s contact cue is absent or leaks internal contact data" % label)
	hud.open_log()
	for _frame in range(8):
		await physics_frame
	for contact_offset in [
		Vector3(0.0, 0.0, 1.5),
		Vector3(1.5, 0.0, 0.0),
		Vector3(-1.5, 0.0, 0.0),
		Vector3(0.0, 0.0, -1.5),
	]:
		player.global_position = contact_actor.global_position + contact_offset
		player.velocity = Vector3.ZERO
		await physics_frame
		if bool(contact_actor.call("_contact_has_line_of_sight")):
			break
	for _frame in range(45):
		await physics_frame
		if str(instance.get("_pending_contact_ready_id")) == consumed_contact_id:
			break
	var ready_position := contact_actor.global_position
	if paused or str(hud.presentation_snapshot().get("modalSurface", "")) != "inspect":
		_failures.append("%s inspect log did not defer contact without pausing" % label)
	# Physical arrival can beat the provider-backed opening. Closing the log in
	# that state must retain the same pending contact without opening an error
	# modal; readiness may then complete and expose explicit player acceptance.
	var unready_contact_actor: Dictionary = instance.call(
		"_actor_view",
		contact_actor_id
	)
	unready_contact_actor["playerConversationReady"] = false
	instance.call("_update_run_actor", unready_contact_actor)
	var playtest_surface := instance.get_node_or_null("AgentPlaytestSurface")
	if playtest_surface == null or not playtest_surface.has_method("_target_snapshot"):
		_failures.append("%s has no semantic target snapshot for contact readiness" % label)
	else:
		var unready_target_snapshot: Dictionary = playtest_surface.call(
			"_target_snapshot",
			contact_actor
		)
		if bool(unready_target_snapshot.get("interactable", true)):
			_failures.append("%s semantic target exposed an unready contact as interactable" % label)
	hud.close_log()
	instance.call("_try_open_pending_contact")
	var deferred_for_opening := hud.presentation_snapshot()
	var deferred_contact: Dictionary = instance.call("presentation_snapshot").get(
		"contact",
		{}
	)
	if (
		str(deferred_for_opening.get("modalSurface", "")) == "conversation"
		or str(instance.get("_pending_contact_ready_id")) != consumed_contact_id
		or instance.get("_conversation_target") != null
		or str(deferred_contact.get("status", "")) != "ready_waiting_opening"
	):
		_failures.append(
			"%s physically ready contact did not wait for its provider opening: %s"
			% [
				label,
				{
					"modal": deferred_for_opening.get("modalSurface", ""),
					"pending": instance.get("_pending_contact_ready_id"),
					"target": instance.get("_conversation_target"),
				},
			]
		)
	var ready_contact_actor := unready_contact_actor.duplicate(true)
	ready_contact_actor["playerConversationReady"] = true
	instance.call("_update_run_actor", ready_contact_actor)
	instance.call("_try_open_pending_contact")
	await process_frame
	if playtest_surface != null and playtest_surface.has_method("_target_snapshot"):
		var ready_target_snapshot: Dictionary = playtest_surface.call(
			"_target_snapshot",
			contact_actor
		)
		var semantic_position: Dictionary = ready_target_snapshot.get("worldPosition", {})
		var interaction_aim := contact_actor.get_interaction_aim_position()
		if (
			not bool(ready_target_snapshot.get("interactable", false))
			or not is_equal_approx(float(semantic_position.get("x", INF)), interaction_aim.x)
			or not is_equal_approx(float(semantic_position.get("y", INF)), interaction_aim.y)
			or not is_equal_approx(float(semantic_position.get("z", INF)), interaction_aim.z)
		):
			_failures.append(
				"%s playtest target did not expose current readiness at the canonical aim point"
				% label
			)
	var waiting_for_player := hud.presentation_snapshot()
	var ready_cue := hud.contact_cue_snapshot()
	var ready_contact: Dictionary = instance.call("presentation_snapshot").get(
		"contact",
		{}
	)
	var projected_cue: Dictionary = {}
	if playtest_surface != null and playtest_surface.has_method("_hud_snapshot"):
		projected_cue = (playtest_surface.call(
			"_hud_snapshot",
			waiting_for_player
		) as Dictionary).get("contactCue", {})
	if (
		paused
		or not bool(player.get("_control_enabled"))
		or str(waiting_for_player.get("modalSurface", "")) == "conversation"
		or instance.get("_conversation_target") != null
		or str(instance.get("_pending_contact_ready_id")) != consumed_contact_id
		or not contact_actor.has_player_contact(consumed_contact_id)
		or not bool(ready_cue.get("visible", false))
		or not bool(ready_cue.get("ready", false))
		or str(ready_cue.get("contactId", "")) != consumed_contact_id
		or str(ready_cue.get("actorId", "")) != contact_actor_id
		or str(ready_contact.get("status", "")) != "ready_waiting_player"
		or not bool(projected_cue.get("visible", false))
		or not bool(projected_cue.get("ready", false))
		or str(projected_cue.get("contactId", "")) != consumed_contact_id
	):
		_failures.append(
			"%s ordinary ready contact opened without explicit player acceptance: %s"
			% [
				label,
				{
					"hud": waiting_for_player,
					"cue": ready_cue,
					"projectedCue": projected_cue,
					"contact": ready_contact,
					"pending": instance.get("_pending_contact_ready_id"),
					"follow": contact_actor.contact_status(),
				},
			]
		)
		paused = false
		return

	# Readiness is current geometry, not a sticky arrival bit. Walking away
	# disables both the E prompt and the ready cue without accepting the lease.
	player.global_position = contact_actor.global_position + Vector3(0.0, 0.0, 3.5)
	player.velocity = Vector3.ZERO
	await physics_frame
	instance.call("_try_open_pending_contact")
	var walked_away_cue := hud.contact_cue_snapshot()
	if (
		contact_actor.player_contact_is_ready(consumed_contact_id)
		or contact_actor.is_interaction_enabled()
		or bool(walked_away_cue.get("ready", false))
		or str(hud.presentation_snapshot().get("modalSurface", "")) == "conversation"
	):
		_failures.append(
			"%s walking away left an ordinary contact ready or opened: %s"
			% [
				label,
				{
					"cue": walked_away_cue,
					"follow": contact_actor.contact_status(),
					"interaction": contact_actor.is_interaction_enabled(),
				},
			]
		)
	var walked_away_press := InputEventKey.new()
	walked_away_press.physical_keycode = KEY_E
	walked_away_press.pressed = true
	Input.parse_input_event(walked_away_press)
	await process_frame
	var walked_away_release := InputEventKey.new()
	walked_away_release.physical_keycode = KEY_E
	walked_away_release.pressed = false
	Input.parse_input_event(walked_away_release)
	await process_frame
	if str(hud.presentation_snapshot().get("modalSurface", "")) == "conversation":
		_failures.append("%s unfocused E accepted a contact outside its ready distance" % label)

	for contact_offset in [
		Vector3(0.0, 0.0, 1.5),
		Vector3(1.5, 0.0, 0.0),
		Vector3(-1.5, 0.0, 0.0),
		Vector3(0.0, 0.0, -1.5),
	]:
		player.global_position = contact_actor.global_position + contact_offset
		player.velocity = Vector3.ZERO
		for _frame in range(12):
			await physics_frame
			if contact_actor.player_contact_is_ready(consumed_contact_id):
				break
		if contact_actor.player_contact_is_ready(consumed_contact_id):
			break
	instance.call("_try_open_pending_contact")
	ready_position = contact_actor.global_position
	if (
		not contact_actor.player_contact_is_ready(consumed_contact_id)
		or not contact_actor.is_interaction_enabled()
		or not bool(hud.contact_cue_snapshot().get("ready", false))
	):
		_failures.append("%s ordinary contact did not become explicitly actionable" % label)
		paused = false
		return
	# Preserve the ready contact while placing it behind the camera, then press
	# the actual project E action. Main must accept its own current contact even
	# though Player3D has no ordinary focus target.
	player.face_position(contact_actor.get_interaction_aim_position())
	player.rotate_y(PI)
	player.call("_set_focused_target", null)
	player.call("_clear_recent_npc_focus")
	await physics_frame
	if player.focused_interactable() != null:
		_failures.append("%s off-camera contact test retained an ordinary focus target" % label)
		paused = false
		return
	var contact_press := InputEventKey.new()
	contact_press.physical_keycode = KEY_E
	contact_press.pressed = true
	Input.parse_input_event(contact_press)
	await process_frame
	var contact_release := InputEventKey.new()
	contact_release.physical_keycode = KEY_E
	contact_release.pressed = false
	Input.parse_input_event(contact_release)
	await process_frame
	var opened := false
	for _frame in range(180):
		await process_frame
		var contact_hud := hud.presentation_snapshot()
		if (
			str(contact_hud.get("modalSurface", "")) == "conversation"
			and not (contact_hud.get("currentTurn", {}) as Dictionary).is_empty()
		):
			opened = true
			break
	if not opened:
		_failures.append("%s accepted contact did not reuse the conversation modal" % label)
		paused = false
		return
	var opened_main: Dictionary = instance.call("presentation_snapshot")
	var adapter: Dictionary = (opened_main.get("advance", {}) as Dictionary).get(
		"adapter",
		{}
	)
	if (
		not paused
		or str(adapter.get("fixtureLastStartContactId", ""))
		!= consumed_contact_id
		or contact_actor.has_player_contact(consumed_contact_id)
		or contact_actor.global_position.distance_to(ready_position) > 0.05
	):
		_failures.append(
			"%s contact start lost its id, pause, or consumed-position invariant" % label
		)
	var current_turn: Dictionary = hud.presentation_snapshot().get("currentTurn", {})
	var choices: Array = current_turn.get("choices", [])
	if choices.size() != 3 or not choices[0] is Dictionary:
		_failures.append("%s contacted conversation has no normal runtime choices" % label)
		paused = false
		return
	# This fixture proves the contact opening only; normal answer/end replay is
	# already covered by main_3d and is intentionally not a second dialogue path.
	instance.call("_finish_conversation_modal")
	await process_frame
	if paused or str(hud.presentation_snapshot().get("modalSurface", "")) != "none":
		_failures.append("%s contacted modal could not release its local presentation" % label)
		paused = false
		return

	# Exercise the same cleanup used by a failed start: the authoritative order
	# remains active, so presentation follow resumes instead of becoming stuck.
	var resume_contact := {
		"contactId": "contact-smoke-resume",
		"actorId": str(receptionist.actor_id),
		"interactionZoneId": "StudioReceptionConversation",
		"originAnchorRef": "Studio.receptionist_spawn",
		"safeDistanceM": 1.6,
		"issuedAtSeconds": elapsed + 2.0,
		"expiresAtSeconds": elapsed + 120.0,
		"reason": "smoke_resume",
		"procedure": "ordinary",
	}
	instance.call("_sync_active_contact_from_response", {"activeContact": resume_contact})
	receptionist.cancel_player_contact()
	instance.set("_conversation_target", receptionist)
	instance.set("_conversation_contact_id", "contact-smoke-resume")
	paused = true
	instance.call("_finish_conversation_modal")
	await process_frame
	if paused or not receptionist.has_player_contact("contact-smoke-resume"):
		_failures.append("%s failed-start cleanup did not resume authoritative contact" % label)
	instance.call("_sync_active_contact_from_response", {"activeContact": null})

	# Run this full-snapshot authority check only after the synthetic contact
	# scenarios above. The fixture adapter correctly owns `activeContact: null`,
	# so rebasing mid-scenario would intentionally revoke their local setup.
	var authoritative_revision := int(
		(instance.get("_run_snapshot") as Dictionary).get("worldRevision", 0)
	)
	instance.call("_sync_active_contact_from_response", {"activeContact": first_contact})
	instance.call(
		"_sync_active_contact_from_response",
		{
			"worldRevision": authoritative_revision - 1,
			"activeContact": null,
		},
		true
	)
	if str((instance.get("_active_contact") as Dictionary).get("contactId", "")) != str(
		first_contact.get("contactId", "")
	):
		_failures.append("%s older authoritative snapshot cleared a newer contact" % label)
	var authoritative_clear := (
		(instance.get("_run_snapshot") as Dictionary).duplicate(true)
	)
	authoritative_clear["activeContact"] = null
	authoritative_clear["worldRevision"] = authoritative_revision
	instance.call("_replace_run_snapshot", authoritative_clear, true)
	instance.call("_apply_social_view_from_response", authoritative_clear, true)
	if not (instance.get("_active_contact") as Dictionary).is_empty():
		_failures.append("%s equal-revision authoritative snapshot retained ghost contact" % label)


func _check_fixture_provider_evidence(
	label: String,
	instance: Node,
	snapshot: Dictionary,
	stage: String
) -> void:
	var audit_value: Variant = snapshot.get("providerAudit")
	var trace_value: Variant = snapshot.get("providerRuntimeTrace")
	if not audit_value is Dictionary or not trace_value is Dictionary:
		_failures.append("%s %s omitted raw provider evidence" % [label, stage])
		return
	var audit := audit_value as Dictionary
	var trace := trace_value as Dictionary
	var provider_budget := snapshot.get("providerBudget", {}) as Dictionary
	if (
		int(audit.get("callsUsed", -1)) != 0
		or int(audit.get("tokensUsed", -1)) != 0
		or int(audit.get("inFlightCalls", -1)) != 0
		or not bool(audit.get("complete", false))
		or bool(audit.get("truncated", true))
		or int(audit.get("droppedCount", -1)) != 0
		or not (audit.get("calls", []) as Array).is_empty()
		or not (audit.get("resolutions", []) as Array).is_empty()
	):
		_failures.append("%s %s scripted provider audit is not empty and complete" % [label, stage])
	if (
		int(provider_budget.get("callsUsed", -1)) != int(audit.get("callsUsed", -2))
		or int(provider_budget.get("tokensUsed", -1)) != int(audit.get("tokensUsed", -2))
	):
		_failures.append("%s %s provider budget did not reconcile from audit" % [label, stage])
	if (
		not bool(trace.get("complete", false))
		or bool(trace.get("truncated", true))
		or int(trace.get("droppedCount", -1)) != 0
	):
		_failures.append("%s %s scripted runtime trace is incomplete" % [label, stage])
	for entry_value in trace.get("entries", []) as Array:
		if not entry_value is Dictionary:
			_failures.append("%s %s scripted runtime trace has malformed entries" % [label, stage])
			break
		var meta := (entry_value as Dictionary).get("meta", {}) as Dictionary
		if str(meta.get("transport", "")) != "scripted" or bool(meta.get("usedFallback", true)):
			_failures.append("%s %s runtime trace lost scripted provenance" % [label, stage])
			break
	var debug_snapshot: Dictionary = instance.call("_debug_snapshot")
	if (
		debug_snapshot.get("providerAudit", {}) != audit
		or debug_snapshot.get("providerRuntimeTrace", {}) != trace
	):
		_failures.append("%s %s debug snapshot lost raw provider evidence" % [label, stage])
	var playtest_surface := instance.get_node_or_null("AgentPlaytestSurface")
	if (
		playtest_surface == null
		or not playtest_surface.has_method("_provider_audit_summary")
	):
		_failures.append("%s %s has no provider audit summary surface" % [label, stage])
		return
	var summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		audit,
		trace
	)
	var fixture_cardinality_reconciled := (
		(audit.get("resolutions", []) as Array).size()
		== (trace.get("entries", []) as Array).size()
	)
	if (
		int(summary.get("callsUsed", -1)) != 0
		or int(summary.get("tokensUsed", -1)) != 0
		or int(summary.get("inFlightCalls", -1)) != 0
		or int(summary.get("inFlightTokens", -1)) != 0
		or not bool(summary.get("complete", false))
		or bool(summary.get("truncated", true))
		or int(summary.get("droppedCount", -1)) != 0
		or int(summary.get("callCount", -1)) != 0
		or int(summary.get("resolutionCount", -1)) != 0
		or not bool(summary.get("traceComplete", false))
		or bool(summary.get("traceTruncated", true))
		or int(summary.get("traceDroppedCount", -1)) != 0
		or int(summary.get("runtimeTraceEntryCount", -1))
		!= (trace.get("entries", []) as Array).size()
		or bool(summary.get("completeCardinalityReconciled", false))
		!= fixture_cardinality_reconciled
		or bool(summary.get("reconciled", false)) != fixture_cardinality_reconciled
		or bool(summary.get("allExpectedProfileLiveNoFallback", true))
		or int(summary.get("failedCallCount", -1)) != 0
		or int(summary.get("fallbackResolutionCount", -1)) != 0
	):
		_failures.append("%s %s empty scripted audit became live acceptance" % [label, stage])
	if stage == "opening":
		_check_provider_audit_summary_contract(label, playtest_surface)


func _check_provider_audit_summary_contract(label: String, playtest_surface: Node) -> void:
	var live_audit := {
		"callsUsed": 1,
		"tokensUsed": 7,
		"inFlightCalls": 0,
		"inFlightTokens": 0,
		"complete": true,
		"truncated": false,
		"droppedCount": 0,
		"calls": [{
			"seq": 1,
			"purpose": "conversation",
			"profileId": "modelscope/qwen3.7-plus",
			"transport": "live",
			"usedFallback": false,
			"outcome": "success",
			"failureReason": null,
			"chargedTokens": 7,
		}],
		"resolutions": [{
			"seq": 1,
			"purpose": "conversation",
			"profileId": "modelscope/qwen3.7-plus",
			"transport": "live",
			"usedFallback": false,
			"fallbackReason": null,
			"callSeqs": [1],
		}],
	}
	var live_trace := {
		"complete": true,
		"truncated": false,
		"droppedCount": 0,
		"entries": [{
			"seq": 1,
			"meta": {
				"profileId": "modelscope/qwen3.7-plus",
				"transport": "live",
				"usedFallback": false,
			},
		}],
	}
	var live_summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		live_audit,
		live_trace
	)
	if (
		not bool(live_summary.get("allExpectedProfileLiveNoFallback", false))
		or not bool(live_summary.get("quiescent", false))
		or not bool(live_summary.get("reconciled", false))
		or int(live_summary.get("failedCallCount", -1)) != 0
		or int(live_summary.get("fallbackResolutionCount", -1)) != 0
	):
		_failures.append("%s exact live Qwen provider evidence did not pass summary" % label)
	var two_resolution_audit := live_audit.duplicate(true)
	two_resolution_audit["callsUsed"] = 2
	two_resolution_audit["tokensUsed"] = 14
	var second_call := ((two_resolution_audit.get("calls", []) as Array)[0] as Dictionary).duplicate(true)
	second_call["seq"] = 2
	(two_resolution_audit.get("calls", []) as Array).append(second_call)
	var second_resolution := (
		((two_resolution_audit.get("resolutions", []) as Array)[0] as Dictionary).duplicate(true)
	)
	second_resolution["seq"] = 2
	second_resolution["callSeqs"] = [2]
	(two_resolution_audit.get("resolutions", []) as Array).append(second_resolution)
	var missing_trace_summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		two_resolution_audit,
		live_trace
	)
	if (
		bool(missing_trace_summary.get("completeCardinalityReconciled", true))
		or bool(missing_trace_summary.get("reconciled", true))
		or bool(missing_trace_summary.get("allExpectedProfileLiveNoFallback", true))
	):
		_failures.append("%s missing provider runtime trace entry became acceptance" % label)
	var two_entry_trace := live_trace.duplicate(true)
	var second_trace_entry := (
		((two_entry_trace.get("entries", []) as Array)[0] as Dictionary).duplicate(true)
	)
	second_trace_entry["seq"] = 2
	(two_entry_trace.get("entries", []) as Array).append(second_trace_entry)
	var matching_cardinality_summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		two_resolution_audit,
		two_entry_trace
	)
	if (
		not bool(matching_cardinality_summary.get("completeCardinalityReconciled", false))
		or not bool(matching_cardinality_summary.get("reconciled", false))
		or not bool(matching_cardinality_summary.get(
			"allExpectedProfileLiveNoFallback",
			false
		))
	):
		_failures.append("%s matching provider resolution/trace evidence did not pass" % label)
	var busy_client_summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		live_audit,
		live_trace,
		1
	)
	if (
		bool(busy_client_summary.get("allExpectedProfileLiveNoFallback", true))
		or bool(busy_client_summary.get("quiescent", true))
		or int(busy_client_summary.get(
			"clientProviderRequestInFlightCount", -1
		)) != 1
	):
		_failures.append("%s client-known provider wait became live acceptance" % label)

	var failed_audit := live_audit.duplicate(true)
	var failed_call := ((failed_audit.get("calls", []) as Array)[0] as Dictionary)
	failed_call["outcome"] = "error"
	failed_call["failureReason"] = "timeout"
	var failed_summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		failed_audit,
		live_trace
	)
	if (
		int(failed_summary.get("failedCallCount", 0)) != 1
		or bool(failed_summary.get("allExpectedProfileLiveNoFallback", true))
	):
		_failures.append("%s failed live call became provider acceptance" % label)

	var fallback_audit := live_audit.duplicate(true)
	var fallback_resolution := (
		(fallback_audit.get("resolutions", []) as Array)[0] as Dictionary
	)
	fallback_resolution["transport"] = "fallback"
	fallback_resolution["usedFallback"] = true
	fallback_resolution["fallbackReason"] = "timeout"
	var fallback_trace := live_trace.duplicate(true)
	var fallback_meta := (
		((fallback_trace.get("entries", []) as Array)[0] as Dictionary).get("meta", {})
		as Dictionary
	)
	fallback_meta["transport"] = "fallback"
	fallback_meta["usedFallback"] = true
	fallback_meta["fallbackReason"] = "timeout"
	var fallback_summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		fallback_audit,
		fallback_trace
	)
	if (
		int(fallback_summary.get("fallbackResolutionCount", 0)) != 1
		or bool(fallback_summary.get("allExpectedProfileLiveNoFallback", true))
	):
		_failures.append("%s fallback resolution became provider acceptance" % label)

	var mislabeled_live_trace := live_trace.duplicate(true)
	var mislabeled_live_meta := (
		((mislabeled_live_trace.get("entries", []) as Array)[0] as Dictionary).get(
			"meta",
			{}
		) as Dictionary
	)
	mislabeled_live_meta["fallbackReason"] = "invalid_envelope"
	var mislabeled_summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		live_audit,
		mislabeled_live_trace
	)
	if bool(mislabeled_summary.get("allExpectedProfileLiveNoFallback", true)):
		_failures.append("%s live runtime trace with a fallback reason became acceptance" % label)

	var unreconciled_audit := live_audit.duplicate(true)
	unreconciled_audit["tokensUsed"] = 8
	var unreconciled_summary: Dictionary = playtest_surface.call(
		"_provider_audit_summary",
		unreconciled_audit,
		live_trace
	)
	if (
		bool(unreconciled_summary.get("reconciled", true))
		or bool(unreconciled_summary.get("allExpectedProfileLiveNoFallback", true))
	):
		_failures.append("%s unreconciled provider totals became acceptance" % label)


func _check_hearing_and_outcome(label: String, instance: Node) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s hearing smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var town := instance.get_node_or_null("Town") as Town3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	var run_session := instance.get_node_or_null("RunSession") as RunSession3D
	if player == null or town == null or hud == null or run_session == null:
		_failures.append("%s hearing smoke is missing Main dependencies" % label)
		return
	var fixture := _load_run_fixture()
	var endpoints: Dictionary = fixture.get("endpoints", {})
	for endpoint_name in ["runHearingOpen", "runHearingAnswer", "runEnd"]:
		if not endpoints.get(endpoint_name, null) is Dictionary:
			_failures.append("%s fixture is missing %s" % [label, endpoint_name])
			return
	var ready := false
	for _frame in range(360):
		await process_frame
		ready = not str(instance.call("presentation_snapshot").get("runId", "")).is_empty()
		if ready:
			break
	if not ready:
		_failures.append("%s run did not initialize before hearing smoke" % label)
		return

	# The same conversation surface owns all three procedures. Only an explicit
	# interrogation turn with a runtime duration may start the timer.
	var timer_signal_count: Array[int] = [0]
	var record_hesitation := func() -> void: timer_signal_count[0] += 1
	hud.hesitation_expired.connect(record_hesitation)
	var base_turn := {
		"turnId": "turn-smoke-procedure",
		"beatId": "beat-smoke-procedure",
		"speakerId": "NPC_Station_Officer",
		"prompt": "Procedure smoke prompt.",
		"acceptsFreeInput": true,
		"continueConversation": true,
		"procedure": "ordinary",
		"hesitationMs": 0,
		"choices": [
			{"choiceId": "smoke-1", "line": "One"},
			{"choiceId": "smoke-2", "line": "Two"},
			{"choiceId": "smoke-3", "line": "Three"},
		],
		"proposalMeta": {"transport": "scripted"},
	}
	hud.begin_conversation({"actorId": "NPC_Station_Officer"})
	hud.show_turn(base_turn)
	if bool(hud.hesitation_timer_snapshot().get("visible", false)):
		_failures.append("%s ordinary conversation exposed the hesitation timer" % label)
	var interrogation_turn := base_turn.duplicate(true)
	interrogation_turn["procedure"] = "interrogation"
	interrogation_turn["hesitationMs"] = 45000
	hud.show_turn(interrogation_turn)
	var timer_started := hud.hesitation_timer_snapshot()
	if (
		not bool(timer_started.get("visible", false))
		or not is_equal_approx(float(timer_started.get("durationSeconds", 0.0)), 45.0)
	):
		_failures.append("%s interrogation did not use runtime hesitationMs" % label)
	hud.call("_process_hesitation_timer", 46.0)
	hud.call("_process_hesitation_timer", 46.0)
	if timer_signal_count[0] != 1:
		_failures.append("%s interrogation hesitation emitted %d times" % [label, timer_signal_count[0]])
	hud.show_turn(interrogation_turn)
	hud.set_conversation_busy(true)
	hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
	hud.call("_process_hesitation_timer", 46.0)
	var timer_after_retry := hud.hesitation_timer_snapshot()
	if (
		timer_signal_count[0] != 1
		or bool(timer_after_retry.get("visible", false))
		or bool(timer_after_retry.get("active", false))
	):
		_failures.append("%s answer retry restarted the interrogation timer" % label)
	if hud.hesitation_expired.is_connected(record_hesitation):
		hud.hesitation_expired.disconnect(record_hesitation)
	hud.close_conversation()

	var stale_conversation_look := Vector2(-0.73, 0.31)
	instance.set("_conversation_return_look", stale_conversation_look)
	instance.set("_conversation_return_look_valid", true)
	instance.call("_enter_hearing_due")
	var due_snapshot: Dictionary = instance.call("presentation_snapshot")
	var due_provider_progress := _provider_evidence_progress_from_snapshot(
		instance,
		due_snapshot
	)
	if (
		str(due_snapshot.get("runStatus", "")) != "hearing_due"
		or not bool(player.get("_control_enabled"))
		or bool((due_snapshot.get("contact", {}) as Dictionary).get("active", false))
		or player.focused_interactable() != null
		or bool(instance.get("_conversation_return_look_valid"))
	):
		_failures.append(
			"%s hearing due did not freeze world work or discard an ordinary view" % label
		)
	for actor_value in instance.get_tree().get_nodes_in_group(&"npc_actors"):
		if actor_value is NPC3D and (actor_value as NPC3D).is_interaction_enabled():
			_failures.append("%s hearing due left a resident interaction prompt enabled" % label)
			break
	for surface_value in instance.get_tree().get_nodes_in_group(&"record_surfaces"):
		if (
			surface_value is Node
			and (surface_value as Node).has_method("is_interaction_enabled")
			and bool((surface_value as Node).call("is_interaction_enabled"))
		):
			_failures.append("%s hearing due left a record interaction prompt enabled" % label)
			break
	instance.call("_dispatch_hearing_open")
	instance.call("_dispatch_hearing_open")
	var staged := false
	for _frame in range(360):
		await process_frame
		var snapshot: Dictionary = instance.call("presentation_snapshot")
		var hud_snapshot := hud.presentation_snapshot()
		if (
			str(snapshot.get("runStatus", "")) == "hearing_active"
			and str(hud_snapshot.get("modalSurface", "")) == "conversation"
			and not (hud_snapshot.get("currentTurn", {}) as Dictionary).is_empty()
		):
			staged = true
			break
	if not staged:
		_failures.append("%s hearing did not open and stage in the shared modal" % label)
		paused = false
		return
	var staged_snapshot: Dictionary = instance.call("presentation_snapshot")
	_check_fixture_provider_evidence(label, instance, staged_snapshot, "hearing open")
	var staged_provider_progress := _provider_evidence_progress_from_snapshot(
		instance,
		staged_snapshot
	)
	if not _provider_progress_is_at_least(
		staged_provider_progress,
		due_provider_progress
	):
		_failures.append("%s hearing open rolled provider evidence backward" % label)
	var staged_hud := hud.presentation_snapshot()
	var staged_turn := staged_hud.get("currentTurn", {}) as Dictionary
	var expected_player_value: Variant = town.navigation_position("Station.hearing_player")
	var expected_focus_value: Variant = town.anchor_position("Station.hearing_table")
	var facing_ok := false
	if expected_focus_value is Vector3:
		var camera := player.get_node("Head/Camera3D") as Camera3D
		var camera_target := expected_focus_value as Vector3 - camera.global_position
		if not camera_target.is_zero_approx():
			facing_ok = (
				(-camera.global_transform.basis.z).normalized().dot(
					camera_target.normalized()
				) > 0.99
			)
	if (
		int((staged_snapshot.get("hearingFlow", {}) as Dictionary).get("openAttempts", 0)) != 1
		or not paused
		or bool(player.get("_control_enabled"))
		or str(staged_turn.get("procedure", "")) != "hearing"
		or not bool(staged_turn.get("acceptsFreeInput", false))
		or not (staged_turn.get("choices", []) as Array).is_empty()
		or staged_turn.get("proposalMeta", {}) != null
		or bool(staged_hud.get("hesitationTimerVisible", true))
		or not expected_player_value is Vector3
		or player.global_position.distance_to(expected_player_value as Vector3) > 0.05
		or not facing_ok
	):
		_failures.append("%s hearing staging lost one-shot, anchor, focus, or modal invariants" % label)

	var answer_packet := endpoints.get("runHearingAnswer", {}) as Dictionary
	var answer_request := answer_packet.get("request", {}) as Dictionary
	var final_answer := answer_request.get("answer", {}) as Dictionary
	instance.call("_submit_hearing_answer", final_answer)
	var terminal := false
	for _frame in range(360):
		await process_frame
		var snapshot: Dictionary = instance.call("presentation_snapshot")
		if (
			str(snapshot.get("runStatus", "")) == "terminal"
			and bool((snapshot.get("outcome", {}) as Dictionary).get("visible", false))
		):
			terminal = true
			break
	if not terminal:
		_failures.append("%s hearing answer did not reach the terminal outcome" % label)
		paused = false
		return
	var terminal_snapshot: Dictionary = instance.call("presentation_snapshot")
	_check_fixture_provider_evidence(label, instance, terminal_snapshot, "terminal hearing")
	var terminal_provider_progress := _provider_evidence_progress_from_snapshot(
		instance,
		terminal_snapshot
	)
	if not _provider_progress_is_at_least(
		terminal_provider_progress,
		staged_provider_progress
	):
		_failures.append("%s terminal hearing lost provider evidence before restart" % label)
	var terminal_result := terminal_snapshot.get("terminalResult", {}) as Dictionary
	var outcome := terminal_snapshot.get("outcome", {}) as Dictionary
	var presented_testimonies := outcome.get("testimonies", []) as Array
	if (
		str(outcome.get("route", "")) != str(terminal_result.get("verdict", ""))
		or int(outcome.get("vouchCount", -1)) != int(terminal_result.get("evidencedVouchCount", -2))
		or int(outcome.get("requiredVouches", 0)) != 4
		or presented_testimonies.size() != 6
		or (outcome.get("recapLines", []) as Array).size()
		!= (terminal_result.get("recap", []) as Array).size()
		or (outcome.get("recapEntries", []) as Array).size()
		!= (terminal_result.get("recap", []) as Array).size()
		or str(outcome.get("officerLine", ""))
		!= str(terminal_result.get("officerLine", ""))
		or (outcome.get("citedRecordIds", []) as Array).size()
		!= (terminal_result.get("citedRecordIds", []) as Array).size()
		or (outcome.get("citedLedgerEventIds", []) as Array).size()
		!= (terminal_result.get("citedLedgerEventIds", []) as Array).size()
		or str(outcome.get("body", "")).contains("NPC_")
	):
		_failures.append("%s outcome omitted verdict, quorum, testimony, recap, or leaked ids" % label)
	for testimony_value in presented_testimonies:
		if (
			not testimony_value is Dictionary
			or str((testimony_value as Dictionary).get("actor", "")).is_empty()
			or str((testimony_value as Dictionary).get("testimony", "")).is_empty()
			or str((testimony_value as Dictionary).get("contactBasis", "")) not in [
				"meaningful_firsthand",
				"limited_firsthand",
				"never_conversed",
			]
			or str(
				(testimony_value as Dictionary).get("contactBasisLabel", "")
			).is_empty()
		):
			_failures.append(
				"%s outcome has an incomplete resident testimony or contact basis" % label
			)
			break
	var fallback_result := terminal_result.duplicate(true)
	var fallback_meta := (fallback_result.get("proposalMeta", {}) as Dictionary).duplicate(true)
	fallback_meta["transport"] = "fallback"
	fallback_meta["usedFallback"] = true
	fallback_meta["fallbackReason"] = "timeout"
	fallback_result["proposalMeta"] = fallback_meta
	hud.show_outcome(fallback_result)
	var fallback_outcome := hud.outcome_snapshot()
	if (
		not bool(fallback_outcome.get("fallbackVisible", false))
		or str(fallback_outcome.get("fallbackReason", "")) != "timeout"
		or str(fallback_outcome.get("fallbackReasonText", "")).is_empty()
	):
		_failures.append("%s fallback hearing verdict was not visibly marked" % label)
	if not hud.restart_requested.is_connected(Callable(instance, "_on_restart_requested")):
		_failures.append("%s restart button signal is not connected to Main" % label)
	var end_packet := endpoints.get("runEnd", {}) as Dictionary
	var end_request := end_packet.get("request", {}) as Dictionary
	var first_end: Dictionary = await run_session.end_run(
		str(end_request.get("runId", "")),
		str(end_request.get("endId", ""))
	)
	var repeated_end: Dictionary = await run_session.end_run(
		str(end_request.get("runId", "")),
		str(end_request.get("endId", ""))
	)
	if (
		str(first_end.get("runStatus", "")) != "closed"
		or first_end != repeated_end
		or not bool(run_session.diagnostics_snapshot().get("fixtureRunClosed", false))
	):
		_failures.append("%s run end was not strict and idempotent" % label)
	paused = false


func _check_run_conversation(label: String, instance: Node) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s conversation smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var receptionist := instance.get_node_or_null("Town/Actors/NPC_Studio_Receptionist") as NPC3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	if player == null or receptionist == null or hud == null:
		return
	var actors: Array[NPC3D] = []
	for actor_value in instance.get_tree().get_nodes_in_group(&"npc_actors"):
		if actor_value is NPC3D:
			actors.append(actor_value as NPC3D)
	var all_residents_ready := false
	for _frame in range(240):
		await process_frame
		all_residents_ready = actors.size() == 6 and actors.all(
			func(actor: NPC3D) -> bool: return actor.is_interaction_enabled()
		)
		if all_residents_ready:
			break
	if not all_residents_ready:
		_failures.append("%s did not preload conversations for all six residents" % label)
		return
	# The final fixture opening makes every resident interactable before its
	# authoritative snapshot rebase has necessarily finished. Let that lane
	# settle before isolated preload-state assertions mutate the actor cache.
	var initial_preloads_settled := false
	for _frame in range(120):
		await process_frame
		if (
			(instance.get("_conversation_preload_queue") as Array).is_empty()
			and (instance.get("_conversation_preload_in_flight") as Dictionary).is_empty()
			and not bool(instance.get("_advance_needs_rebase"))
			and not bool(instance.get("_advance_rebase_in_flight"))
		):
			initial_preloads_settled = true
			break
	if not initial_preloads_settled:
		_failures.append("%s initial conversation preload rebase did not settle" % label)
		return
	_check_preload_failure_recovery_contract(label, instance, str(receptionist.actor_id))
	_check_preload_rebase_and_invalidation_epoch_contract(
		label,
		instance,
		str(receptionist.actor_id)
	)
	_check_stale_advance_response_contract(label, instance)
	var locale_snapshot: Dictionary = instance.call("presentation_snapshot")
	_check_fixture_provider_evidence(label, instance, locale_snapshot, "opening")
	var locked_run_locale := str(locale_snapshot.get("runLocale", ""))
	if locked_run_locale.is_empty() or locked_run_locale != str(instance.call("_api_locale")):
		_failures.append("%s did not lock one API locale for the run" % label)
	if not bool(locale_snapshot.get("languageAppliesNextRun", false)):
		_failures.append("%s does not mark later language changes as next-run settings" % label)
	var localization := root.get_node_or_null("Localization")
	if (
		localization == null
		or str(
			localization.call(
				"api_locale",
				str(locale_snapshot.get("presentationLocale", ""))
			)
		) != locked_run_locale
	):
		_failures.append("%s presentation and run locales start mixed" % label)
	_check_player_brief_contract(label, instance)
	await _check_conversation_start_not_ready_recovery_contract(
		label,
		instance,
		str(receptionist.actor_id)
	)
	var town := instance.get_node_or_null("Town") as Town3D
	for actor in actors:
		var expected_connection := Callable(
			instance,
			"_on_conversation_requested"
		).bind(actor)
		if not actor.conversation_requested.is_connected(expected_connection):
			_failures.append("%s leaves %s conversation signal unwired" % [label, actor.actor_id])
		if town != null:
			var actor_snapshot: Dictionary = instance.call("_actor_view", str(actor.actor_id))
			var zone_id := town.conversation_zone_id(
				str(actor.actor_id),
				str(actor_snapshot.get("locationId", ""))
			)
			if zone_id.is_empty():
				_failures.append(
					"%s cannot derive %s conversation zone from current location"
					% [label, actor.actor_id]
				)

	player.global_position = receptionist.global_position + Vector3(0.0, 0.0, 1.5)
	player.velocity = Vector3.ZERO
	if not await _interact_with_npc_through_player(
		label,
		player,
		receptionist,
		"normal conversation"
	):
		paused = false
		return
	var conversation_return_look: Vector2 = instance.get("_conversation_return_look")
	var opened := false
	for _frame in range(120):
		await process_frame
		var hud_snapshot := hud.presentation_snapshot()
		var current_turn: Dictionary = hud_snapshot.get("currentTurn", {})
		if str(hud_snapshot.get("modalSurface", "")) == "conversation" and not current_turn.is_empty():
			opened = true
			break
	if not opened:
		_failures.append(
			(
				"%s fixture conversation did not open (enabled=%s, run=%s, paused=%s, "
				+ "target=%s, advance=%s)"
			) % [
				label,
				receptionist.is_interaction_enabled(),
				str(instance.get("_run_status")),
				paused,
				str(instance.get("_conversation_target")),
				str((instance.call("presentation_snapshot") as Dictionary).get("advance", {})),
			]
		)
		paused = false
		return
	if not paused:
		_failures.append("%s world is not paused during conversation" % label)
	if bool(player.get("_control_enabled")):
		_failures.append("%s player control stayed enabled during conversation" % label)
	if player.has_method("can_jump") and bool(player.call("can_jump")):
		_failures.append("%s player can jump during modal conversation" % label)
	var opened_snapshot := hud.presentation_snapshot()
	var opened_provider: Dictionary = opened_snapshot.get("provider", {})
	if str(opened_provider.get("transport", "")) != "scripted":
		_failures.append("%s conversation does not visibly identify fixture provenance" % label)
	var opened_turn: Dictionary = opened_snapshot.get("currentTurn", {})
	var choices_value: Variant = opened_turn.get("choices", [])
	if not choices_value is Array or (choices_value as Array).size() != 3:
		_failures.append("%s conversation does not expose exactly three runtime choices" % label)
		paused = false
		return
	var first_choice: Variant = (choices_value as Array)[0]
	if not first_choice is Dictionary:
		_failures.append("%s conversation first choice is invalid" % label)
		paused = false
		return
	hud.choice_submitted.emit(str((first_choice as Dictionary).get("choiceId", "")))

	var ended := false
	var conversation_end_deadline_msec := Time.get_ticks_msec() + 5000
	while Time.get_ticks_msec() < conversation_end_deadline_msec:
		await process_frame
		var hud_snapshot := hud.presentation_snapshot()
		if str(hud_snapshot.get("modalSurface", "")) == "none" and not paused:
			ended = true
			break
	if not ended:
		_failures.append("%s fixture conversation did not end and resume the world" % label)
		paused = false
		return
	if not bool(player.get("_control_enabled")):
		_failures.append("%s player control did not resume after conversation" % label)
	if (
		(player.call("look_orientation") as Vector2).distance_to(
			conversation_return_look
		) > 0.001
	):
		_failures.append("%s conversation did not restore the player's prior view" % label)
	if receptionist.is_interaction_enabled():
		_failures.append("%s leaves a false receptionist re-conversation prompt" % label)
	if receptionist.is_interaction_focusable():
		_failures.append("%s leaves a pending prompt after the clean receptionist session" % label)
	var main_snapshot: Dictionary = instance.call("presentation_snapshot")
	var stance_judgment: Dictionary = (
		hud.presentation_snapshot().get("stanceJudgment", {}) as Dictionary
	)
	if (
		str(stance_judgment.get("actorId", ""))
		!= "NPC_Studio_Receptionist"
		or str(stance_judgment.get("stanceBefore", "")).is_empty()
		or str(stance_judgment.get("stanceAfter", "")).is_empty()
		or (
			str(stance_judgment.get("stanceBefore", ""))
			== str(stance_judgment.get("stanceAfter", ""))
			and int(stance_judgment.get("suspicionDelta", 0)) == 0
		)
	):
		_failures.append("%s does not retain a legible receptionist judgment shift" % label)
	var advance_diagnostics: Dictionary = main_snapshot.get("advance", {})
	var adapter_diagnostics: Dictionary = advance_diagnostics.get("adapter", {})
	var expected_end_revision := int(adapter_diagnostics.get("fixtureSessionEndRevision", -1))
	if (
		expected_end_revision < 0
		or int(main_snapshot.get("runWorldRevision", -1)) != expected_end_revision
	):
		_failures.append("%s run revision did not reach idempotent child-session end" % label)
	var provider: Dictionary = main_snapshot.get("provider", {})
	if str(provider.get("transport", "")) != "scripted":
		_failures.append("%s fixture provider provenance is not scripted" % label)
	var stance_summaries: Variant = main_snapshot.get("encounteredStances", [])
	if not stance_summaries is Array or (stance_summaries as Array).size() != 1:
		_failures.append("%s did not retain the encountered receptionist stance" % label)
	else:
		var stance_entry: Variant = (stance_summaries as Array)[0]
		if not stance_entry is Dictionary or str((stance_entry as Dictionary).get("stance", "")) != "vouch":
			_failures.append("%s did not present the runtime-judged vouch stance" % label)
		elif not str((stance_entry as Dictionary).get("summary", "")).is_empty():
			_failures.append("%s leaked a stance why-line outside the inspect log" % label)
		else:
			var social_view: Dictionary = main_snapshot.get("socialView", {})
			var disclosed_residents: Array = social_view.get("encounteredResidents", [])
			var why_line := ""
			if not disclosed_residents.is_empty() and disclosed_residents[0] is Dictionary:
				why_line = str((disclosed_residents[0] as Dictionary).get("whyLine", ""))
			var log_snapshot: Dictionary = hud.presentation_snapshot().get("log", {})
			if why_line.is_empty() or not str(log_snapshot.get("body", "")).contains(why_line):
				_failures.append("%s inspect log omitted the disclosed stance why-line" % label)
	var record_surface := instance.get_node_or_null(
		"Town/Props/TextSurfaces/TS_Studio_ReviewRecords"
	)
	if record_surface == null or not record_surface.has_method("interact"):
		_failures.append("%s has no interactable Studio record surface" % label)
	else:
		player.global_position = Vector3(3.5, 0.05, -17.0)
		player.velocity = Vector3.ZERO
		await physics_frame
		var close_events: Array[int] = [0]
		hud.log_visibility_changed.connect(func(visible: bool) -> void:
			if not visible:
				close_events[0] += 1
		)
		record_surface.call("interact", player)
		var pending_snapshot := hud.presentation_snapshot()
		var pending_log: Dictionary = pending_snapshot.get("log", {})
		hud.toggle_log()
		hud.close_log()
		var close_button := hud.get_node_or_null(
			"Overlay/LogShade/LogPanel/LogMargin/LogColumns/CloseLogButton"
		) as Button
		if close_button != null:
			close_button.pressed.emit()
		var resisted_close := hud.presentation_snapshot()
		if (
			str(pending_snapshot.get("modalSurface", "")) != "inspect"
			or not bool(pending_log.get("busy", false))
			or str(resisted_close.get("modalSurface", "")) != "inspect"
			or not bool((resisted_close.get("log", {}) as Dictionary).get("busy", false))
			or bool(player.get("_control_enabled"))
			or paused
			or close_events[0] != 0
		):
			_failures.append(
				"%s pending record inspect could close or release its player lock" % label
			)
		var record_log_opened := false
		for _frame in range(120):
			await process_frame
			var inspect_snapshot := hud.presentation_snapshot()
			var inspect_log: Dictionary = inspect_snapshot.get("log", {})
			var inspect_social: Dictionary = inspect_snapshot.get("socialView", {})
			if (
				str(inspect_snapshot.get("modalSurface", "")) == "inspect"
				and not bool(inspect_log.get("busy", true))
				and (inspect_social.get("encounteredRecords", []) as Array).size() == 1
			):
				record_log_opened = true
				break
		if not record_log_opened:
			_failures.append("%s record encounter did not open the inspect log" % label)
		else:
			var record_snapshot: Dictionary = instance.call("presentation_snapshot")
			var record_social: Dictionary = record_snapshot.get("socialView", {})
			var record_pressure: Dictionary = record_snapshot.get("institutionalPressure", {})
			var encountered_records: Array = record_social.get("encounteredRecords", [])
			if (
				paused
				or bool(player.get("_control_enabled"))
				or str(record_pressure.get("band", "")) != "raised"
				or encountered_records.size() != 1
			):
				_failures.append(
					"%s record inspect failed its non-pausing disclosed-view contract" % label
				)
			hud.close_log()
			await process_frame
			hud.close_log()
			await process_frame
			if (
				not bool(player.get("_control_enabled"))
				or paused
				or close_events[0] != 1
			):
				_failures.append(
					"%s record inspect did not restore player control exactly once" % label
				)
	var manager := instance.get_node_or_null("Town/Actors/NPC_Studio_Manager") as NPC3D
	var caretaker := instance.get_node_or_null("Town/Actors/NPC_Park_Caretaker") as NPC3D
	if manager != null and caretaker != null:
		var look_revision := int(main_snapshot.get("runWorldRevision", -1))
		var actor_target_position: Variant = instance.call(
			"_look_target_position",
			"actor",
			str(receptionist.actor_id)
		)
		if (
			not actor_target_position is Vector3
			or not (actor_target_position as Vector3).is_equal_approx(
				receptionist.global_position + Vector3.UP * 1.35
			)
		):
			_failures.append("%s actor look target did not resolve canonically" % label)
		instance.call(
			"_apply_conversation_end_deltas_once",
			"smoke-queued-look",
			look_revision,
			[{
				"kind": "look",
				"actorId": str(manager.actor_id),
				"targetKind": "actor",
				"targetId": str(receptionist.actor_id),
				"worldRevision": look_revision,
			}]
		)
		var first_forward := -manager.global_transform.basis.z.normalized()
		# A duplicate successful session-end response must not apply a second batch.
		instance.call(
			"_apply_conversation_end_deltas_once",
			"smoke-queued-look",
			look_revision,
			[{
				"kind": "look",
				"actorId": str(manager.actor_id),
				"targetKind": "actor",
				"targetId": str(caretaker.actor_id),
				"worldRevision": look_revision,
			}]
		)
		var second_forward := -manager.global_transform.basis.z.normalized()
		var to_receptionist := receptionist.global_position - manager.global_position
		to_receptionist.y = 0.0
		if (
			first_forward.distance_to(second_forward) > 0.001
			or (
				not to_receptionist.is_zero_approx()
				and second_forward.dot(to_receptionist.normalized()) < 0.99
			)
		):
			_failures.append("%s queued look delta was not applied exactly once" % label)
		await _check_non_actor_look_targets(label, instance, manager, look_revision)


func _check_non_actor_look_targets(
	label: String,
	instance: Node,
	actor: NPC3D,
	look_revision: int
) -> void:
	var prop_id := "Prop_Studio_Keyboard"
	var prop := instance.get_node_or_null(
		"Town/Props/PhysicalProps3D/%s" % prop_id
	) as Node3D
	if prop == null:
		_failures.append("%s has no canonical physical prop for look resolution" % label)
	else:
		var object_target_position: Variant = instance.call(
			"_look_target_position",
			"object",
			prop_id
		)
		var prop_collision := prop.get_node_or_null("Collision") as Node3D
		if (
			not object_target_position is Vector3
			or prop_collision == null
			or not (object_target_position as Vector3).is_equal_approx(
				prop_collision.global_position
			)
		):
			_failures.append(
				"%s object look target did not resolve by canonical prop_id" % label
			)
		else:
			instance.call("_apply_look_delta", {
				"kind": "look",
				"actorId": str(actor.actor_id),
				"targetKind": "object",
				"targetId": prop_id,
				"worldRevision": look_revision,
			})
			if not _npc_faces_position(actor, object_target_position as Vector3):
				_failures.append("%s object look delta did not face the physical prop" % label)
			var object_look_forward := -actor.global_transform.basis.z.normalized()
			for _frame in range(8):
				await physics_frame
			var held_object_forward := -actor.global_transform.basis.z.normalized()
			if (
				object_look_forward.distance_to(held_object_forward) > 0.001
				or float(actor.movement_status().get("lookHoldRemaining", 0.0)) <= 0.0
			):
				_failures.append(
					"%s object look delta was overwritten on the next physics frames" % label
				)

	var saved_run_snapshot: Dictionary = instance.get("_run_snapshot")
	var fixture := _load_run_fixture()
	var endpoints: Dictionary = fixture.get("endpoints", {})
	var administration_packet: Dictionary = endpoints.get("administrationWriteDecision", {})
	var administration_response: Dictionary = administration_packet.get("response", {})
	var action_deltas: Array = administration_response.get("actionDeltas", [])
	var administration_delta: Dictionary = {}
	for delta_value in action_deltas:
		if delta_value is Dictionary and str(
			(delta_value as Dictionary).get("kind", "")
		) == "administration":
			administration_delta = (delta_value as Dictionary).duplicate(true)
			break
	var administration_read_packet: Dictionary = endpoints.get(
		"administrationReadDecision", {}
	)
	var administration_read_response: Dictionary = administration_read_packet.get(
		"response", {}
	)
	var administration_read_delta: Dictionary = {}
	for delta_value in administration_read_response.get("actionDeltas", []):
		if delta_value is Dictionary and str(
			(delta_value as Dictionary).get("kind", "")
		) == "administration":
			administration_read_delta = (delta_value as Dictionary).duplicate(true)
			break
	var authoritative_record: Dictionary = administration_delta.get("record", {})
	if authoritative_record.is_empty():
		_failures.append(
			"%s fixture has no authoritative administration record delta" % label
		)
	else:
		# Mirror the live response order: the decision revision becomes current,
		# then the generated backend delta enters the ordinary application path.
		# Remove only this record from the starting cache so unrelated entries, if
		# present, must survive the merge.
		var record_id := str(authoritative_record.get("recordId", ""))
		var text_surface_id := str(authoritative_record.get("textSurfaceId", ""))
		var authoritative_ledger_event: Dictionary = administration_delta.get(
			"ledgerEvent", {}
		)
		var ledger_event_id := str(authoritative_ledger_event.get("eventId", ""))
		var delta_snapshot := saved_run_snapshot.duplicate(true)
		delta_snapshot["worldRevision"] = int(administration_response.get("worldRevision", -1))
		delta_snapshot["institutionalPressure"] = int(
			administration_delta.get("pressureBefore", 0)
		)
		var starting_records: Array = []
		var prior_records_value: Variant = delta_snapshot.get("records", [])
		if prior_records_value is Array:
			var prior_records := prior_records_value as Array
			for record_value in prior_records:
				if (
					record_value is Dictionary
					and str((record_value as Dictionary).get("recordId", "")) != record_id
				):
					starting_records.append((record_value as Dictionary).duplicate(true))
		delta_snapshot["records"] = starting_records
		var starting_ledger_events: Array = []
		for ledger_value in delta_snapshot.get("ledgerEvents", []):
			if (
				ledger_value is Dictionary
				and str((ledger_value as Dictionary).get("eventId", "")) != ledger_event_id
			):
				starting_ledger_events.append((ledger_value as Dictionary).duplicate(true))
		delta_snapshot["ledgerEvents"] = starting_ledger_events
		instance.set("_run_snapshot", delta_snapshot)
		instance.call("_apply_run_deltas", [administration_delta])
		var applied_snapshot := instance.get("_run_snapshot") as Dictionary
		var cached_records: Array = applied_snapshot.get(
			"records", []
		)
		var cached_record := _record_by_id(cached_records, record_id)
		if (
			cached_record != authoritative_record
			or cached_records.size() != starting_records.size() + 1
		):
			_failures.append(
				"%s administration delta did not populate the authoritative record cache"
				% label
			)
		var cached_ledger_events: Array = applied_snapshot.get("ledgerEvents", [])
		var cached_ledger_matches := cached_ledger_events.filter(func(value: Variant) -> bool:
			return (
				value is Dictionary
				and str((value as Dictionary).get("eventId", "")) == ledger_event_id
			)
		)
		if (
			authoritative_ledger_event.is_empty()
			or cached_ledger_matches.size() != 1
			or cached_ledger_matches[0] != authoritative_ledger_event
			or int(applied_snapshot.get("institutionalPressure", -1))
			!= int(administration_delta.get("pressureAfter", -2))
		):
			_failures.append(
				"%s administration delta left pressure/ledger debug state stale" % label
			)

		# A read keeps the record revision but advances lastLedgerEventId. The
		# client must accept that exact authoritative equal-revision mutation and
		# apply its record/ledger/pressure tuple atomically after the write.
		if administration_read_delta.is_empty():
			_failures.append("%s fixture has no administration read delta" % label)
		else:
			instance.call("_apply_run_deltas", [administration_read_delta])
			applied_snapshot = instance.get("_run_snapshot") as Dictionary
			var read_record: Dictionary = administration_read_delta.get("record", {})
			var read_ledger_event: Dictionary = administration_read_delta.get(
				"ledgerEvent", {}
			)
			var read_event_id := str(read_ledger_event.get("eventId", ""))
			var read_cached_record := _record_by_id(
				applied_snapshot.get("records", []),
				record_id
			)
			var read_event_matches := (
				applied_snapshot.get("ledgerEvents", []) as Array
			).filter(func(value: Variant) -> bool:
				return (
					value is Dictionary
					and str((value as Dictionary).get("eventId", "")) == read_event_id
				)
			)
			if (
				read_cached_record != read_record
				or int(read_cached_record.get("recordRevision", -1))
				!= int(authoritative_record.get("recordRevision", -2))
				or str(read_cached_record.get("lastLedgerEventId", "")) != read_event_id
				or read_event_matches.size() != 1
				or read_event_matches[0] != read_ledger_event
				or int(applied_snapshot.get("institutionalPressure", -1))
				!= int(administration_read_delta.get("pressureAfter", -2))
			):
				_failures.append(
					"%s administration write/read sequence left authority state stale"
					% label
				)

		# A conflicting ledger sequence must reject the whole tuple. In
		# particular, it cannot leave a new record cached while pressure/ledger
		# stay at the prior authority state.
		var before_conflict := applied_snapshot.duplicate(true)
		var conflicting_record := authoritative_record.duplicate(true)
		conflicting_record["recordId"] = "record:smoke:conflicting-ledger-seq"
		var conflicting_event := authoritative_ledger_event.duplicate(true)
		conflicting_event["eventId"] = "ledger:smoke:conflicting-ledger-seq"
		conflicting_event["recordId"] = conflicting_record["recordId"]
		instance.call("_apply_run_deltas", [{
			"kind": "administration",
			"record": conflicting_record,
			"ledgerEvent": conflicting_event,
			"pressureBefore": administration_delta.get("pressureBefore", 0),
			"pressureAfter": administration_delta.get("pressureAfter", 0),
		}])
		if (instance.get("_run_snapshot") as Dictionary) != before_conflict:
			_failures.append(
				"%s conflicting administration tuple applied a torn record state" % label
			)
		var record_surface := instance.get_node_or_null(
			"Town/Props/TextSurfaces/%s" % text_surface_id
		) as Node3D
		var record_target_position: Variant = instance.call(
			"_look_target_position",
			"record",
			record_id
		)
		var surface_collision: Node3D = null
		if record_surface != null:
			surface_collision = record_surface.get_node_or_null("Collision") as Node3D
		if (
			record_id.is_empty()
			or text_surface_id.is_empty()
			or not record_target_position is Vector3
			or surface_collision == null
			or not (record_target_position as Vector3).is_equal_approx(
				surface_collision.global_position
			)
		):
			_failures.append(
				"%s record look target did not resolve through its authoritative text surface"
				% label
			)
		else:
			instance.call("_apply_look_delta", {
				"kind": "look",
				"actorId": str(actor.actor_id),
				"targetKind": "record",
				"targetId": record_id,
				"worldRevision": int(administration_response.get("worldRevision", -1)),
			})
			if not _npc_faces_position(actor, record_target_position as Vector3):
				_failures.append(
					"%s record look delta did not face its text surface" % label
				)
			var record_look_forward := -actor.global_transform.basis.z.normalized()
			for _frame in range(8):
				await physics_frame
			var held_record_forward := -actor.global_transform.basis.z.normalized()
			if (
				record_look_forward.distance_to(held_record_forward) > 0.001
				or float(actor.movement_status().get("lookHoldRemaining", 0.0)) <= 0.0
			):
				_failures.append(
					"%s record look delta was overwritten on the next physics frames" % label
				)

		# A lower revision for the same record id cannot roll back presentation
		# identity, and malformed records cannot mutate the cache at all.
		var monotonic_id := "record:smoke:monotonic"
		var newer_record := authoritative_record.duplicate(true)
		newer_record["recordId"] = monotonic_id
		newer_record["recordRevision"] = 2
		instance.call("_apply_run_deltas", [{
			"kind": "administration",
			"record": newer_record,
		}])
		var stale_record := newer_record.duplicate(true)
		stale_record["recordRevision"] = 1
		stale_record["textSurfaceId"] = "TS_Office_FilingIndex"
		instance.call("_apply_run_deltas", [{
			"kind": "administration",
			"record": stale_record,
		}])
		cached_records = (instance.get("_run_snapshot") as Dictionary).get("records", [])
		var retained_record := _record_by_id(cached_records, monotonic_id)
		if (
			int(retained_record.get("recordRevision", -1)) != 2
			or str(retained_record.get("textSurfaceId", "")) != text_surface_id
		):
			_failures.append("%s stale administration record rolled the cache backward" % label)
		var records_before_malformed := cached_records.duplicate(true)
		instance.call("_apply_run_deltas", [{
			"kind": "administration",
			"record": {
				"recordId": "record:smoke:malformed",
				"textSurfaceId": text_surface_id,
			},
		}])
		if (
			(instance.get("_run_snapshot") as Dictionary).get("records", [])
			!= records_before_malformed
		):
			_failures.append("%s malformed administration record mutated the cache" % label)
	instance.set("_run_snapshot", saved_run_snapshot)

	var before_unknown := -actor.global_transform.basis.z.normalized()
	instance.call("_apply_look_delta", {
		"kind": "look",
		"actorId": str(actor.actor_id),
		"targetKind": "object",
		"targetId": "Prop_Unknown_Smoke",
		"worldRevision": look_revision,
	})
	var after_unknown := -actor.global_transform.basis.z.normalized()
	if before_unknown.distance_to(after_unknown) > 0.001:
		_failures.append("%s unknown look target mutated resident presentation" % label)


func _record_by_id(records: Array, record_id: String) -> Dictionary:
	for record_value in records:
		if (
			record_value is Dictionary
			and str((record_value as Dictionary).get("recordId", "")) == record_id
		):
			return (record_value as Dictionary).duplicate(true)
	return {}


func _npc_faces_position(actor: NPC3D, target_position: Vector3) -> bool:
	var to_target := target_position - actor.global_position
	to_target.y = 0.0
	if to_target.is_zero_approx():
		return false
	var forward := -actor.global_transform.basis.z
	forward.y = 0.0
	return (
		not forward.is_zero_approx()
		and forward.normalized().dot(to_target.normalized()) >= 0.99
	)


func _check_run_clock_and_schedule(label: String, instance: Node) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s schedule smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var office_worker := instance.get_node_or_null(
		"Town/Actors/NPC_Office_Worker"
	) as NPC3D
	if office_worker == null:
		_failures.append("%s has no office worker for schedule movement" % label)
		return
	var fixture := _load_run_fixture()
	var fixture_endpoints: Dictionary = fixture.get("endpoints", {})
	var preload_packets: Array = fixture_endpoints.get("sessionPreloads", [])
	var preload_baseline_revision := 0
	for preload_value in preload_packets:
		if preload_value is Dictionary:
			var preload_response: Dictionary = (preload_value as Dictionary).get("response", {})
			preload_baseline_revision = maxi(
				preload_baseline_revision,
				int(preload_response.get("worldRevision", 0))
			)

	var snapshot: Dictionary = {}
	var run_ready := false
	for _frame in range(120):
		await process_frame
		snapshot = instance.call("presentation_snapshot")
		var scheduler_value: Variant = snapshot.get("scheduler", {})
		var adapter: Dictionary = (snapshot.get("advance", {}) as Dictionary).get(
			"adapter",
			{}
		)
		if (
			not str(snapshot.get("runId", "")).is_empty()
			and scheduler_value is Dictionary
			and not (scheduler_value as Dictionary).is_empty()
			and int(adapter.get("fixturePreloadCount", -1)) == preload_packets.size()
			and int(snapshot.get("runWorldRevision", -1)) == preload_baseline_revision
		):
			run_ready = true
			break
	if not run_ready:
		_failures.append("%s fixture run did not auto-start with scheduler state" % label)
		return
	if int(snapshot.get("runWorldRevision", -1)) != preload_baseline_revision:
		_failures.append("%s schedule run did not reach its preloaded baseline" % label)
	var initial_clock: Dictionary = snapshot.get("worldClock", {})
	if float(initial_clock.get("elapsedSeconds", -1.0)) != 0.0:
		_failures.append("%s fresh schedule clock did not start at zero" % label)
	var initial_budget: Dictionary = snapshot.get("providerBudget", {})
	if int(initial_budget.get("callsUsed", -1)) != 0:
		_failures.append("%s schedule run started with provider calls" % label)
	var initial_office_scheduler := _scheduler_actor(snapshot, "NPC_Office_Worker")
	var initial_office_anchor := str(initial_office_scheduler.get("confirmedAnchorRef", ""))
	if initial_office_anchor.is_empty():
		_failures.append("%s scheduler exposes no confirmed office-worker anchor" % label)

	var office_start := office_worker.global_position
	instance.set("_advance_elapsed_buffer", 10.0)
	var first_advance_applied := false
	for _frame in range(120):
		await process_frame
		snapshot = instance.call("presentation_snapshot")
		var movement_actor_ids := _active_movement_actor_ids(snapshot)
		if (
			int(snapshot.get("runWorldRevision", -1)) == preload_baseline_revision + 1
			and movement_actor_ids.is_empty()
		):
			first_advance_applied = true
			break
	if not first_advance_applied:
		_failures.append(
			(
				"%s first ten-second advance did not settle before patrol departures "
				+ "(advance=%s pending=%s)"
			)
			% [
				label,
				snapshot.get("advance", {}),
				instance.get("_pending_advance_request"),
			]
		)
		return
	var first_movement_actor_ids := _active_movement_actor_ids(snapshot)
	if not first_movement_actor_ids.is_empty():
		_failures.append(
			"%s patrol moved before its first deterministic due time: %s"
			% [label, first_movement_actor_ids.keys()]
		)
	var first_clock: Dictionary = snapshot.get("worldClock", {})
	if float(first_clock.get("elapsedSeconds", -1.0)) != 10.0:
		_failures.append("%s first advance did not reach ten world seconds" % label)
	var first_spatial: Dictionary = (snapshot.get("advance", {}) as Dictionary).get(
		"lastSpatialFacts",
		{}
	)
	if (
		int(first_spatial.get("observedWorldRevision", -1)) != preload_baseline_revision
		or int(first_spatial.get("actorCount", -1)) != 6
	):
		_failures.append("%s initial material advance omitted six revisioned spatial facts" % label)

	# Semantic route dwell is deliberately long enough for a live provider
	# opening to resolve. Advance through the quiet part of the initial dwell,
	# then verify the first staggered departures at 50 world seconds.
	var initial_patrol_applied := false
	for target_seconds in [20, 30, 40, 50]:
		instance.set("_advance_elapsed_buffer", 10.0)
		var target_revision := preload_baseline_revision + int(target_seconds / 10)
		var target_settled := false
		for _frame in range(120):
			await process_frame
			snapshot = instance.call("presentation_snapshot")
			var target_clock: Dictionary = snapshot.get("worldClock", {})
			if (
				int(snapshot.get("runWorldRevision", -1)) == target_revision
				and float(target_clock.get("elapsedSeconds", -1.0)) == float(target_seconds)
			):
				target_settled = true
				break
		if not target_settled:
			_failures.append(
				"%s schedule advance did not settle at %s world seconds" % [label, target_seconds]
			)
			return
		var target_actor_ids := _active_movement_actor_ids(snapshot)
		if target_seconds < 50 and not target_actor_ids.is_empty():
			_failures.append(
				"%s patrol moved before the configured 45-60 second dwell: %s"
				% [label, target_actor_ids.keys()]
			)
		elif (
			target_seconds == 50
			and target_actor_ids.has("NPC_Studio_Manager")
			and target_actor_ids.has("NPC_Office_Worker")
			and target_actor_ids.size() == 2
		):
			initial_patrol_applied = true
	if not initial_patrol_applied:
		_failures.append("%s initial staggered patrols were not issued at 50 seconds" % label)
		return
	first_clock = snapshot.get("worldClock", {})

	# Main processes while paused so conversation HTTP can finish, but its clock
	# lane explicitly returns and Town/NPC physics are pausable.
	var pause_position := office_worker.global_position
	var pause_clock := float(first_clock.get("elapsedSeconds", -1.0))
	var pause_buffer := float(instance.get("_advance_elapsed_buffer"))
	paused = true
	for _frame in range(16):
		await process_frame
	var paused_snapshot: Dictionary = instance.call("presentation_snapshot")
	if office_worker.global_position.distance_to(pause_position) > 0.001:
		_failures.append("%s NPC physics advanced while SceneTree was paused" % label)
	var paused_clock: Dictionary = paused_snapshot.get("worldClock", {})
	if float(paused_clock.get("elapsedSeconds", -1.0)) != pause_clock:
		_failures.append("%s world clock advanced while SceneTree was paused" % label)
	if absf(float(instance.get("_advance_elapsed_buffer")) - pause_buffer) > 0.001:
		_failures.append("%s clock buffer accumulated while SceneTree was paused" % label)
	paused = false

	var physical_progress := false
	var arrivals_applied := false
	# The first dwell batch contains two short indoor legs.
	for _frame in range(480):
		await physics_frame
		var planar_progress := Vector2(
			office_worker.global_position.x - pause_position.x,
			office_worker.global_position.z - pause_position.z
		).length()
		physical_progress = physical_progress or planar_progress > 0.15
		snapshot = instance.call("presentation_snapshot")
		var arrivals_value: Variant = (snapshot.get("arrivals", {}) as Dictionary).get(
			"applied",
			[]
		)
		if (
			int(snapshot.get("runWorldRevision", -1)) >= preload_baseline_revision + 6
			and arrivals_value is Array
			and (arrivals_value as Array).size() == 2
		):
			arrivals_applied = true
			break
	if not physical_progress:
		_failures.append("%s office worker made no physical progress after resume" % label)
	else:
		var total_progress := Vector2(
			office_worker.global_position.x - office_start.x,
			office_worker.global_position.z - office_start.z
		).length()
		if total_progress < 0.25:
			_failures.append("%s runtime movement made no readable physical progress" % label)
	if not arrivals_applied:
		_failures.append(
			(
				"%s first movement arrivals were not acknowledged together "
				+ "(advance=%s pending=%s active=%s queued=%s)"
			)
			% [
				label,
				snapshot.get("advance", {}),
				instance.get("_pending_advance_request"),
				snapshot.get("activeMovements", []),
				instance.get("_queued_arrivals"),
			]
		)
		return
	var arrival_spatial: Dictionary = (snapshot.get("advance", {}) as Dictionary).get(
		"lastSpatialFacts",
		{}
	)
	if (
		int(arrival_spatial.get("observedWorldRevision", -1))
		!= preload_baseline_revision + 5
		or int(arrival_spatial.get("actorCount", -1)) != 6
	):
		_failures.append("%s exact-arrival advance omitted refreshed spatial facts" % label)
	var arrived_office_scheduler := _scheduler_actor(snapshot, "NPC_Office_Worker")
	var arrived_office_anchor := str(
		arrived_office_scheduler.get("confirmedAnchorRef", "")
	)
	if arrived_office_anchor != "Office.work_desk":
		_failures.append("%s office-worker arrival did not confirm its runtime anchor" % label)
	elif arrived_office_anchor == initial_office_anchor:
		_failures.append("%s arrival acknowledgement did not change confirmed anchor" % label)

	# The remaining four residents reach their individual 45-60 second dwell
	# deadlines in the next material advance.
	instance.set("_advance_elapsed_buffer", 10.0)
	var late_patrol_applied := false
	for _frame in range(120):
		await process_frame
		snapshot = instance.call("presentation_snapshot")
		var late_actor_ids := _active_movement_actor_ids(snapshot)
		if (
			int(snapshot.get("runWorldRevision", -1)) == preload_baseline_revision + 7
			and late_actor_ids.has("NPC_Studio_Receptionist")
			and late_actor_ids.has("NPC_Park_Caretaker")
			and late_actor_ids.has("NPC_Station_Officer")
			and late_actor_ids.has("NPC_Roaming_Liaison")
			and late_actor_ids.size() == 4
		):
			late_patrol_applied = true
			break
	if not late_patrol_applied:
		_failures.append("%s remaining staggered patrols were not issued at 60 seconds" % label)
		return
	var late_clock: Dictionary = snapshot.get("worldClock", {})
	if float(late_clock.get("elapsedSeconds", -1.0)) != 60.0:
		_failures.append("%s late patrol advance did not reach sixty world seconds" % label)
	var late_arrivals_applied := false
	for _frame in range(720):
		await physics_frame
		snapshot = instance.call("presentation_snapshot")
		var late_arrivals_value: Variant = (snapshot.get("arrivals", {}) as Dictionary).get(
			"applied",
			[]
		)
		if (
			int(snapshot.get("runWorldRevision", -1)) >= preload_baseline_revision + 8
			and late_arrivals_value is Array
			and (late_arrivals_value as Array).size() == 4
		):
			late_arrivals_applied = true
			break
	if not late_arrivals_applied:
		_failures.append("%s remaining staggered patrol arrivals were not acknowledged" % label)
		return
	var final_budget: Dictionary = snapshot.get("providerBudget", {})
	if int(final_budget.get("callsUsed", -1)) != 0:
		_failures.append("%s deterministic scheduling consumed provider calls" % label)

	var run_session := instance.get_node_or_null("RunSession") as RunSession3D
	var fixture_backend: Object = run_session.get("_backend") if run_session != null else null
	if fixture_backend == null:
		_failures.append("%s fixture run session backend is unavailable" % label)
		return
	var fixture_sequence: Array = fixture_backend.call("_advance_sequence")
	fixture_backend.set("_advance_index", fixture_sequence.size())
	instance.set("_pending_advance_request", {
		"runId": snapshot.get("runId", ""),
		"advanceId": "%s:fixture-complete-smoke" % snapshot.get("runId", ""),
		"observedWorldRevision": snapshot.get("runWorldRevision", 0),
		"afterSpeechSeq": 0,
		"elapsedSeconds": 1,
		"arrivals": [],
	})
	await instance.call("_dispatch_advance")
	var completed_snapshot: Dictionary = instance.call("presentation_snapshot")
	var completed_advance: Dictionary = completed_snapshot.get("advance", {})
	if not bool(completed_advance.get("fixtureReplayComplete", false)):
		_failures.append("%s fixture replay end was not exposed as completion" % label)
	if bool(completed_advance.get("pending", true)):
		_failures.append("%s fixture replay end retained a pending advance" % label)
	if not str(completed_advance.get("haltedReason", "missing")).is_empty():
		_failures.append("%s fixture replay end was exposed as a halted lane" % label)
	var completed_revision := int(completed_snapshot.get("runWorldRevision", -1))
	instance.set("_advance_elapsed_buffer", 10.0)
	for _frame in range(4):
		await process_frame
	var settled_snapshot: Dictionary = instance.call("presentation_snapshot")
	var settled_advance: Dictionary = settled_snapshot.get("advance", {})
	if (
		bool(settled_advance.get("pending", false))
		or bool(settled_advance.get("inFlight", false))
		or int(settled_snapshot.get("runWorldRevision", -1)) != completed_revision
	):
		_failures.append("%s fixture replay completion issued another advance" % label)


func _check_ambient_speech(
	label: String,
	instance: Node,
	player_inside: bool,
	leave_before_second := false
) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s ambient speech smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	var run_session := instance.get_node_or_null("RunSession") as RunSession3D
	var manager := instance.get_node_or_null(
		"Town/Actors/NPC_Studio_Manager"
	) as NPC3D
	var caretaker := instance.get_node_or_null(
		"Town/Actors/NPC_Park_Caretaker"
	) as NPC3D
	if (
		player == null
		or hud == null
		or run_session == null
		or manager == null
		or caretaker == null
	):
		return

	var fixture := _load_run_fixture()
	var fixture_endpoints: Dictionary = fixture.get("endpoints", {})
	var preload_packets: Array = fixture_endpoints.get("sessionPreloads", [])
	var run_ready := false
	for _frame in range(120):
		await process_frame
		var startup_snapshot: Dictionary = instance.call("presentation_snapshot")
		var startup_adapter: Dictionary = (
			startup_snapshot.get("advance", {}) as Dictionary
		).get("adapter", {})
		if (
			not str(startup_snapshot.get("runId", "")).is_empty()
			and int(startup_adapter.get("fixturePreloadCount", -1)) == preload_packets.size()
		):
			run_ready = true
			break
	if not run_ready:
		_failures.append("%s fixture run did not start for ambient speech" % label)
		return

	var endpoints: Dictionary = fixture.get("endpoints", {})
	var decision_packet: Dictionary = endpoints.get("npcDecision", {})
	var delivery_packet: Dictionary = endpoints.get("runAdvanceAmbientSpeech", {})
	var snapshot_packet: Dictionary = endpoints.get("runSnapshotAfterMeeting", {})
	if decision_packet.is_empty() or delivery_packet.is_empty() or snapshot_packet.is_empty():
		_failures.append("%s generated ambient fixture endpoints are missing" % label)
		return

	player.global_position = (
		Vector3(0.0, 0.05, 0.0)
		if player_inside
		else Vector3(0.0, 0.05, -16.0)
	)
	player.velocity = Vector3.ZERO
	await physics_frame

	var decision_response: Dictionary = decision_packet.get("response", {})
	var decision_events: Array = decision_response.get("speechEvents", [])
	if decision_events.size() != 2:
		_failures.append("%s fixture NPC decision did not return exactly two utterances" % label)
		return
	var meeting_wake := _fixture_meeting_ready_wake(fixture)
	if meeting_wake.is_empty():
		_failures.append("%s fixture has no meeting-ready wake" % label)
		return
	instance.call("_queue_ambient_decision_wakes", [meeting_wake])
	var decision_completed := false
	for _frame in range(120):
		await process_frame
		var decision_snapshot: Dictionary = instance.call("presentation_snapshot")
		var decision_ambient: Dictionary = decision_snapshot.get("ambientSpeech", {})
		var decision_lane: Dictionary = decision_ambient.get("decisionLane", {})
		var events_value: Variant = decision_ambient.get("events", [])
		if (
			str(decision_lane.get("lastStatus", "")) == "completed"
			and events_value is Array
			and (events_value as Array).size() == 2
		):
			decision_completed = true
			break
	if not decision_completed:
		_failures.append("%s main ambient decision lane did not complete" % label)
		return
	# The meeting changes participant memories and invalidates their initial
	# openings. Fixture mode has no second authored opening, so those stale
	# cache hits must fail once and drain rather than entering a rebase loop.
	var ambient_preloads_settled := false
	for _frame in range(32):
		await process_frame
		var queued_preloads: Array = instance.get("_conversation_preload_queue")
		var in_flight_preloads: Dictionary = instance.get("_conversation_preload_in_flight")
		if (
			queued_preloads.is_empty()
			and in_flight_preloads.is_empty()
			and not bool(instance.get("_advance_needs_rebase"))
		):
			ambient_preloads_settled = true
			break
	if not ambient_preloads_settled:
		_failures.append("%s stale fixture opening entered a preload/rebase loop" % label)
		return

	var delivery_response: Dictionary = delivery_packet.get("response", {})
	instance.call(
		"apply_ambient_speech_events",
		delivery_response.get("ambientSpeechEvents", [])
	)
	var meeting_snapshot: Dictionary = snapshot_packet.get("response", {})
	var snapshot_ambient: Dictionary = meeting_snapshot.get("ambientSpeech", {})
	instance.call("apply_ambient_speech_events", snapshot_ambient.get("events", []))
	await process_frame

	var main_snapshot: Dictionary = instance.call("presentation_snapshot")
	var ambient: Dictionary = main_snapshot.get("ambientSpeech", {})
	var ingested_events: Array = ambient.get("events", [])
	if int(ambient.get("cursor", -1)) != 2 or ingested_events.size() != 2:
		_failures.append(
			"%s did not dedupe decision/advance/snapshot speech by seq" % label
		)
		return
	var adapter_diagnostics: Dictionary = (main_snapshot.get("advance", {}) as Dictionary).get(
		"adapter",
		{}
	)
	if int(adapter_diagnostics.get("fixtureDecisionCallCount", -1)) != 1:
		_failures.append("%s ambient wake did not use exactly one fixture decision call" % label)
	if (
		int((ingested_events[0] as Dictionary).get("seq", -1)) != 1
		or int((ingested_events[1] as Dictionary).get("seq", -1)) != 2
	):
		_failures.append("%s ambient speech history lost sequence order" % label)
	var expected_listeners: Variant = (decision_events[0] as Dictionary).get(
		"listenerActorIds",
		[]
	)
	if (ingested_events[0] as Dictionary).get("listenerActorIds", []) != expected_listeners:
		_failures.append("%s client lost backend listener provenance" % label)

	var hud_snapshot: Dictionary = hud.presentation_snapshot()
	var subtitle: Dictionary = hud_snapshot.get("ambientSubtitle", {})
	var manager_blip := manager.get_node_or_null("SpeechBlip") as AudioStreamPlayer3D
	var caretaker_blip := caretaker.get_node_or_null("SpeechBlip") as AudioStreamPlayer3D
	if player_inside:
		var current: Dictionary = subtitle.get("current", {})
		var current_audibility := current.get("audibility", {}) as Dictionary
		var expected_blip_distance := float(
			current_audibility.get("maxSpeechDistanceM", 0.0)
		)
		if (
			not bool(subtitle.get("visible", false))
			or int(current.get("seq", -1)) != 1
			or int(subtitle.get("queuedCount", -1)) != 1
		):
			_failures.append("%s did not queue the two audible subtitles sequentially" % label)
			return
		if (
			str(current.get("direction", ""))
			not in ["left", "center", "right", "behind"]
			or not str(current.get("formattedText", "")).contains(
				str(current.get("line", ""))
			)
		):
			_failures.append("%s audible subtitle lacks direction or generated line" % label)
		if manager_blip == null or not manager_blip.playing:
			_failures.append("%s first audible utterance did not play its spatial blip" % label)
		elif (
			expected_blip_distance <= 0.0
			or not is_equal_approx(manager_blip.max_distance, expected_blip_distance)
		):
			_failures.append("%s spatial blip did not use semantic speech distance" % label)
		var manager_forward := -manager.global_transform.basis.z.normalized()
		var manager_to_caretaker := caretaker.global_position - manager.global_position
		manager_to_caretaker.y = 0.0
		if (
			not manager_to_caretaker.is_zero_approx()
			and manager_forward.dot(manager_to_caretaker.normalized()) < 0.95
		):
			_failures.append("%s meeting participants did not face one another" % label)
		if leave_before_second:
			player.global_position = Vector3(0.0, 0.05, -16.0)
			player.velocity = Vector3.ZERO
			await physics_frame
			hud.set("_ambient_subtitle_remaining", 0.0)
			var dropped_subtitle: Dictionary = {}
			for _frame in range(4):
				await process_frame
				dropped_subtitle = hud.presentation_snapshot().get(
					"ambientSubtitle",
					{}
				)
				if (dropped_subtitle.get("current", {}) as Dictionary).is_empty():
					break
			if (
				bool(dropped_subtitle.get("visible", false))
				or not (dropped_subtitle.get("current", {}) as Dictionary).is_empty()
				or int(dropped_subtitle.get("queuedCount", -1)) != 0
			):
				_failures.append(
					"%s did not drop the queued subtitle after leaving audibility: %s"
					% [label, dropped_subtitle]
				)
			if caretaker_blip != null and caretaker_blip.playing:
				_failures.append(
					"%s played the queued blip after leaving audibility" % label
				)
		else:
			hud.set("_ambient_subtitle_remaining", 0.0)
			await process_frame
			var second_subtitle: Dictionary = hud.presentation_snapshot().get(
				"ambientSubtitle",
				{}
			)
			if (
				int((second_subtitle.get("current", {}) as Dictionary).get("seq", -1)) != 2
				or int(second_subtitle.get("queuedCount", -1)) != 0
			):
				_failures.append("%s second ambient subtitle did not follow the first" % label)
			if caretaker_blip == null or not caretaker_blip.playing:
				_failures.append("%s second audible utterance did not play its spatial blip" % label)
	else:
		if (
			bool(subtitle.get("visible", false))
			or int(subtitle.get("queuedCount", -1)) != 0
		):
			_failures.append("%s showed speech outside the semantic audibility volume" % label)
		if (
			(manager_blip != null and manager_blip.playing)
			or (caretaker_blip != null and caretaker_blip.playing)
		):
			_failures.append("%s played a blip when the subtitle predicate was false" % label)


func _load_run_fixture() -> Dictionary:
	var path := "res://data/fixtures/run-api-examples.json"
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	return (parsed as Dictionary).duplicate(true) if parsed is Dictionary else {}


func _fixture_meeting_ready_wake(fixture: Dictionary) -> Dictionary:
	var sequence_value: Variant = fixture.get("runAdvanceSequence", [])
	if not sequence_value is Array:
		return {}
	for packet_value in sequence_value as Array:
		if not packet_value is Dictionary:
			continue
		var response: Dictionary = (packet_value as Dictionary).get("response", {})
		var wakes_value: Variant = response.get("scheduleWakes", [])
		if not wakes_value is Array:
			continue
		for wake_value in wakes_value as Array:
			if (
				wake_value is Dictionary
				and str((wake_value as Dictionary).get("kind", "")) == "meeting_ready"
			):
				return (wake_value as Dictionary).duplicate(true)
	return {}


func _scheduler_actor(snapshot: Dictionary, actor_id: String) -> Dictionary:
	var scheduler_value: Variant = snapshot.get("scheduler", {})
	if not scheduler_value is Dictionary:
		return {}
	var actors_value: Variant = (scheduler_value as Dictionary).get("actors", [])
	if not actors_value is Array:
		return {}
	for actor_value in actors_value as Array:
		if (
			actor_value is Dictionary
			and str((actor_value as Dictionary).get("actorId", "")) == actor_id
		):
			return (actor_value as Dictionary).duplicate(true)
	return {}


func _active_movement_actor_ids(snapshot: Dictionary) -> Dictionary:
	var actor_ids: Dictionary = {}
	var movements_value: Variant = snapshot.get("activeMovements", [])
	if not movements_value is Array:
		return actor_ids
	for movement_value in movements_value as Array:
		if movement_value is Dictionary:
			actor_ids[str((movement_value as Dictionary).get("actorId", ""))] = true
	return actor_ids


func _interact_with_npc_through_player(
	label: String,
	player: CharacterBody3D,
	actor: NPC3D,
	context: String
) -> bool:
	player.face_position(actor.get_interaction_aim_position())
	for _frame in range(3):
		await physics_frame
	var focused: Node = player.focused_interactable()
	if focused != actor:
		_failures.append(
			"%s %s did not acquire the NPC through Player3D focus: %s"
			% [label, context, str(focused)]
		)
		return false
	if not player.interact_focused():
		_failures.append("%s %s did not accept Player3D interact" % [label, context])
		return false
	return true


func _check_town_dressing_density(label: String, town: Node) -> void:
	var zone_minimums := {
		"Props/ParkDressing": 20,
		"Props/ExteriorDressing": 25,
		"Props/StudioDressing": 18,
		"Props/OfficeDressing": 16,
		"Props/StationDressing": 18,
	}
	var total_owned_nodes := 0
	for path: String in zone_minimums:
		var zone := town.get_node_or_null(path)
		if zone == null:
			_failures.append("%s dense town is missing %s" % [label, path])
			continue
		var owned_count := _count_scene_owned_descendants(zone, town)
		total_owned_nodes += owned_count
		if owned_count < int(zone_minimums[path]):
			_failures.append(
				"%s %s has only %d authored dressing nodes; expected at least %d"
				% [label, path, owned_count, int(zone_minimums[path])]
			)
	if total_owned_nodes < 97:
		_failures.append(
			"%s dense town has only %d authored dressing nodes across all zones"
			% [label, total_owned_nodes]
		)
	for kaykit_path in [
		"Props/StudioDressing/StudioWaitingArea/PillowArmchair",
		"Props/OfficeDressing/OfficeWallDetails/FilingCabinet",
		"Props/StationDressing/StationWaitingArea/WaitingCouch",
	]:
		_require_node(label, town, kaykit_path)
	var dressing_blockers := town.get_node_or_null("Props/Blockers/DressingBlockers")
	if dressing_blockers == null:
		_failures.append("%s dense town has no large-furniture blocker group" % label)
	elif _count_static_bodies(dressing_blockers) < 16:
		_failures.append("%s dense town has fewer than 16 large-furniture blockers" % label)
	var exterior_blockers := town.get_node_or_null(
		"Props/Blockers/ExteriorDressingBlockers"
	)
	if exterior_blockers == null:
		_failures.append("%s dense town has no large-exterior-prop blocker group" % label)
	elif _count_static_bodies(exterior_blockers) < 10:
		_failures.append("%s dense town has fewer than 10 exterior prop blockers" % label)
	var density_pass := town.get_node_or_null("Props/DensityPass")
	if density_pass == null:
		_failures.append("%s dense town has no mixed-asset density pass" % label)
		return
	var density_minimums := {
		"Park": 50,
		"Street": 36,
		"Studio": 24,
		"Office": 24,
		"Station": 24,
	}
	var density_total := 0
	for zone_name: String in density_minimums:
		var zone := density_pass.get_node_or_null(zone_name)
		if zone == null:
			_failures.append("%s density pass is missing zone %s" % [label, zone_name])
			continue
		var visible_count := 0
		for layer_name in ["GroundLayer", "EyeLevelLayer", "VerticalLayer"]:
			var layer := zone.get_node_or_null(layer_name)
			if layer == null:
				_failures.append(
					"%s density pass %s is missing %s" % [label, zone_name, layer_name]
				)
				continue
			visible_count += layer.get_child_count()
		density_total += visible_count
		if visible_count < int(density_minimums[zone_name]):
			_failures.append(
				"%s density pass %s has only %d visible assets; expected at least %d"
				% [label, zone_name, visible_count, int(density_minimums[zone_name])]
			)
	if density_total < 158:
		_failures.append(
			"%s mixed-asset density pass has only %d visible assets" % [label, density_total]
		)
	var density_blockers := density_pass.get_node_or_null("Blockers")
	if density_blockers == null:
		_failures.append("%s density pass has no blockers for its added park trees" % label)
	elif not density_blockers.is_in_group(&"town_navigation_source"):
		_failures.append("%s density blockers are absent from the navigation bake" % label)
	elif _count_static_bodies(density_blockers) < 4:
		_failures.append("%s density pass has fewer than four park-tree blockers" % label)


func _count_scene_owned_descendants(node: Node, scene_owner: Node) -> int:
	var count := 0
	for child_value in node.get_children():
		var child := child_value as Node
		if child.owner == scene_owner:
			count += 1
		count += _count_scene_owned_descendants(child, scene_owner)
	return count


func _count_static_bodies(node: Node) -> int:
	var count := 1 if node is StaticBody3D else 0
	for child_value in node.get_children():
		count += _count_static_bodies(child_value as Node)
	return count


func _anchor_position(layout: Dictionary, anchor_ref: String) -> Vector3:
	var parts := anchor_ref.split(".", false, 1)
	if parts.size() != 2:
		return Vector3.ZERO
	for landmark_value in layout.get("landmarks", []):
		if not landmark_value is Dictionary:
			continue
		var landmark := landmark_value as Dictionary
		if str(landmark.get("id", "")) != parts[0]:
			continue
		var anchors: Dictionary = landmark.get("anchors", {})
		return _vector3_from_json(anchors.get(parts[1], []))
	return Vector3.ZERO


func _vector3_from_json(value: Variant) -> Vector3:
	if not value is Array or (value as Array).size() != 3:
		return Vector3.ZERO
	var numbers := value as Array
	return Vector3(float(numbers[0]), float(numbers[1]), float(numbers[2]))

func _require_node(label: String, instance: Node, path: String) -> void:
	if instance.get_node_or_null(path) == null:
		_failures.append("%s is missing runtime node %s" % [label, path])

func _has_failure_for(label: String) -> bool:
	for failure in _failures:
		if failure.begins_with(label) or failure.begins_with("%s " % label):
			return true
	return false
