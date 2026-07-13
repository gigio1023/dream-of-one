class_name NPC3D
extends CharacterBody3D

## Reusable presentation and movement shell for one town resident.
##
## The scene root is at the actor's feet. Schedulers may request movement and
## conversations, but social state and world truth remain outside this node.

signal conversation_requested(actor_id: StringName)
signal movement_arrived(movement_id: String, actor_id: StringName, anchor_ref: String)
signal movement_blocked(
	movement_id: String,
	actor_id: StringName,
	anchor_ref: String,
	reason: String
)
signal player_contact_ready(contact_id: String, actor_id: StringName)

const POLICY_IDLE: StringName = &"idle"
const POLICY_WALK: StringName = &"walk"
const POLICY_ANIMATIONS := {
	POLICY_IDLE: &"Idle",
	POLICY_WALK: &"Walk",
}
const WEAPON_NAME_TOKENS: PackedStringArray = [
	"weapon",
	"gun",
	"pistol",
	"rifle",
	"shotgun",
	"sword",
	"knife",
	"blade",
]
const SPEECH_BLIP_MIX_RATE := 22050
const SPEECH_BLIP_SECONDS := 0.14
const SPEECH_BLIP_FREQUENCY_HZ := 210.0
const CONTACT_RETARGET_SECONDS := 0.25
const CONTACT_RETARGET_DISTANCE_M := 0.5
const CONTACT_MIN_SAFE_DISTANCE_M := 1.2
const CONTACT_MAX_SAFE_DISTANCE_M := 2.2
const MOVE_NONE: StringName = &"none"
const MOVE_AMBIENT: StringName = &"ambient"
const MOVE_COMMAND: StringName = &"command"
const MOVE_CONTACT: StringName = &"contact"
const MOVE_CONTACT_RETURN: StringName = &"contact_return"
const AMBIENT_TARGET_ATTEMPTS := 12
const AMBIENT_MIN_DISPLACEMENT_M := 0.7
const AMBIENT_PROJECTION_TOLERANCE_M := 0.65
const AMBIENT_PATH_LENGTH_FACTOR := 3.0
const PROGRESS_SAMPLE_SECONDS := 0.5
const STUCK_GRACE_SECONDS := 0.75
const STUCK_TRIGGER_SECONDS := 1.5
const STUCK_MIN_PROGRESS_M := 0.08
const MAX_LOCAL_REPATH_ATTEMPTS := 2
const YIELD_MIN_SECONDS := 0.45
const YIELD_MAX_SECONDS := 0.9
const DESTINATION_CLEARANCE_M := 0.9
const LOOK_HOLD_SECONDS := 0.75
const MAX_INFERRED_DYNAMIC_YIELDS := 1
const TURN_SPEED_RADIANS_PER_SECOND := deg_to_rad(240.0)

@export var actor_id: StringName
@export var label_key: StringName
@export var role_key: StringName
@export var accent := Color(0.82, 0.82, 0.82)
@export var character_scene: PackedScene
@export var conversation_enabled := false
@export_range(0.1, 8.0, 0.1, "or_greater") var walk_speed := 2.2
@export var ambient_wander_enabled := true
@export_range(0.8, 4.0, 0.1, "or_greater") var ambient_wander_radius := 1.8
@export_range(0.25, 10.0, 0.25, "or_greater") var ambient_dwell_min_seconds := 1.5
@export_range(0.25, 12.0, 0.25, "or_greater") var ambient_dwell_max_seconds := 3.75

@onready var _visual_root: Node3D = $VisualRoot
@onready var _role_accent: MeshInstance3D = $RoleAccent
@onready var _navigation_agent: NavigationAgent3D = $NavigationAgent3D
@onready var _speech_blip: AudioStreamPlayer3D = $SpeechBlip

var _animation_player: AnimationPlayer
var _policy_state: StringName = POLICY_IDLE
var _pending_target := Vector3.ZERO
var _has_pending_target := false
var _pending_move_mode: StringName = MOVE_NONE
var _moving := false
var _movement_mode: StringName = MOVE_NONE
var _movement_id := ""
var _movement_anchor_ref := ""
var _movement_target := Vector3.ZERO
var _contact_id := ""
var _contact_target: Node3D
var _contact_safe_distance := 1.6
var _contact_retarget_remaining := 0.0
var _contact_last_target_position := Vector3(INF, INF, INF)
var _contact_moving := false
var _contact_ready_emitted := false
var _contact_ready_signaled := false
var _contact_retarget_count := 0
var _default_target_desired_distance := 0.4
var _ambient_rng := RandomNumberGenerator.new()
var _ambient_center := Vector3.ZERO
var _ambient_dwell_remaining := 0.0
var _ambient_suspended := false
var _ambient_policy_held := false
var _ambient_cycle_count := 0
var _ambient_reselection_count := 0
var _ambient_selection_failure_count := 0
var _yield_remaining := 0.0
var _yield_resume_mode: StringName = MOVE_NONE
var _yield_count := 0
var _repath_attempts := 0
var _stuck_recovery_count := 0
var _progress_sample_remaining := PROGRESS_SAMPLE_SECONDS
var _progress_grace_remaining := 0.0
var _stuck_elapsed := 0.0
var _progress_sample_position := Vector3.ZERO
var _last_recovery_reason := ""
var _look_hold_remaining := 0.0
var _inferred_dynamic_yield_count := 0


func _ready() -> void:
	add_to_group(&"npc_actors")
	add_to_group(&"interactables")
	_navigation_agent.avoidance_enabled = false
	_navigation_agent.max_speed = walk_speed
	# A stable per-actor priority breaks symmetric RVO deadlocks without making
	# locomotion depend on a provider decision or frame timing.
	var actor_hash := absi(str(actor_id).hash())
	_navigation_agent.avoidance_priority = 0.35 + float(actor_hash % 41) * 0.01
	_default_target_desired_distance = _navigation_agent.target_desired_distance
	_navigation_agent.velocity_computed.connect(_on_velocity_computed)
	_ambient_rng.seed = actor_hash + 1
	_ambient_center = global_position
	_ambient_suspended = not ambient_wander_enabled
	_schedule_ambient_dwell(false)
	_reset_progress_tracking()
	_apply_role_accent()
	_instantiate_character()
	_speech_blip.stream = _build_speech_blip()
	_play_policy_state()


func _physics_process(delta: float) -> void:
	_look_hold_remaining = maxf(0.0, _look_hold_remaining - delta)
	if not is_on_floor():
		velocity += get_gravity() * delta
	elif velocity.y < 0.0:
		velocity.y = 0.0

	if not _contact_id.is_empty():
		_process_player_contact(delta)
		return

	if _yield_remaining > 0.0:
		_process_yield(delta)
		move_and_slide()
		return

	if _has_pending_target and _navigation_map_is_synchronized():
		_begin_pending_move()
		# NavigationServer3D applies the new target on its next synchronization.
		# Do not query the path in the same physics tick that submits it.
		move_and_slide()
		return

	if not _moving:
		_tick_ambient_wander(delta)
		velocity.x = 0.0
		velocity.z = 0.0
		move_and_slide()
		return

	if _navigation_agent.is_navigation_finished():
		_complete_move()
		move_and_slide()
		return

	if _track_motion_progress(delta):
		_recover_from_stuck_motion()
		move_and_slide()
		return

	var next_path_position := _navigation_agent.get_next_path_position()
	var desired_direction := next_path_position - global_position
	desired_direction.y = 0.0
	if not desired_direction.is_zero_approx():
		desired_direction = desired_direction.normalized()
	_navigation_agent.velocity = desired_direction * walk_speed


func move_to(target_position: Vector3) -> void:
	_movement_id = ""
	_movement_anchor_ref = ""
	_ambient_suspended = false
	_queue_navigation_move(target_position, MOVE_AMBIENT)


func apply_movement_command(
	movement_id: String,
	anchor_ref: String,
	projected_target: Vector3
) -> bool:
	if movement_id.is_empty() or anchor_ref.is_empty():
		return false
	if movement_id == _movement_id:
		return true
	if not _contact_id.is_empty():
		# A schedule movement is presentation data; it cannot revoke the
		# RunService-owned player contact order.
		return false
	_cancel_navigation_motion()
	_ambient_suspended = false
	_movement_id = movement_id
	_movement_anchor_ref = anchor_ref
	_movement_target = projected_target
	_queue_navigation_move(projected_target, MOVE_COMMAND)
	return true


func stop() -> void:
	_clear_contact_state()
	_cancel_navigation_motion()
	_ambient_suspended = true
	_navigation_agent.target_desired_distance = _default_target_desired_distance
	_movement_id = ""
	_movement_anchor_ref = ""
	_movement_target = Vector3.ZERO


func set_ambient_policy_hold(held: bool) -> void:
	if _ambient_policy_held == held:
		return
	_ambient_policy_held = held
	if held:
		# Schedule travel and player contact still preempt this presentation
		# hold. Only local, non-authoritative wander is cancelled so a resident
		# that reached a meeting slot cannot drift away while the runtime still
		# treats that slot as confirmed.
		if (
			_movement_mode == MOVE_AMBIENT
			or _pending_move_mode == MOVE_AMBIENT
			or _yield_resume_mode == MOVE_AMBIENT
		):
			_cancel_navigation_motion()
			_movement_target = Vector3.ZERO
		_ambient_dwell_remaining = 0.0
		return
	if not _ambient_suspended and ambient_wander_enabled:
		_ambient_center = global_position
		_schedule_ambient_dwell(false)


func face_position(target_position: Vector3) -> void:
	var flat_target := Vector3(target_position.x, global_position.y, target_position.z)
	if not flat_target.is_equal_approx(global_position):
		look_at(flat_target, Vector3.UP)
		# Runtime-authored look is presentation, so it must not cancel a schedule
		# command or player contact. Hold the facing briefly while locomotion keeps
		# advancing; later path steering then resumes without forging an arrival.
		_look_hold_remaining = LOOK_HOLD_SECONDS


func begin_player_contact(
	contact_id: String,
	target: Node3D,
	safe_distance_m := 1.6
) -> bool:
	if contact_id.is_empty() or target == null:
		return false
	if contact_id == _contact_id and target == _contact_target:
		_contact_safe_distance = clampf(
			safe_distance_m,
			CONTACT_MIN_SAFE_DISTANCE_M,
			CONTACT_MAX_SAFE_DISTANCE_M
		)
		_navigation_agent.target_desired_distance = _contact_safe_distance
		return true
	stop()
	_ambient_suspended = false
	_contact_id = contact_id
	_contact_target = target
	_contact_safe_distance = clampf(
		safe_distance_m,
		CONTACT_MIN_SAFE_DISTANCE_M,
		CONTACT_MAX_SAFE_DISTANCE_M
	)
	_contact_retarget_remaining = 0.0
	_contact_last_target_position = Vector3(INF, INF, INF)
	_contact_moving = false
	_contact_ready_emitted = false
	_contact_ready_signaled = false
	_contact_retarget_count = 0
	_repath_attempts = 0
	_navigation_agent.target_desired_distance = _contact_safe_distance
	set_policy_state(POLICY_WALK)
	return true


func cancel_player_contact(return_position: Variant = null) -> void:
	if _contact_id.is_empty():
		return
	_clear_contact_state()
	_cancel_navigation_motion()
	_ambient_suspended = false
	_navigation_agent.target_desired_distance = _default_target_desired_distance
	if return_position is Vector3:
		# This is only visual recovery after an authoritative contact cancellation.
		# It carries no runtime movement id and therefore cannot emit an arrival.
		_movement_id = ""
		_movement_anchor_ref = ""
		_movement_target = return_position as Vector3
		_queue_navigation_move(return_position as Vector3, MOVE_CONTACT_RETURN)
	else:
		_movement_target = Vector3.ZERO
		_ambient_center = global_position
		_schedule_ambient_dwell(false)


func has_player_contact(contact_id := "") -> bool:
	return (
		not _contact_id.is_empty()
		and (contact_id.is_empty() or contact_id == _contact_id)
	)


func player_contact_is_ready(contact_id: String) -> bool:
	if (
		contact_id != _contact_id
		or not _contact_ready_emitted
		or not is_instance_valid(_contact_target)
	):
		return false
	return (
		_planar_distance(global_position, _contact_target.global_position)
		<= _contact_safe_distance + 0.15
		and _contact_has_line_of_sight()
	)


func contact_status() -> Dictionary:
	return {
		"contactId": _contact_id,
		"active": not _contact_id.is_empty(),
		"moving": _contact_moving,
		"ready": player_contact_is_ready(_contact_id),
		"readySignaled": _contact_ready_signaled,
		"safeDistanceM": _contact_safe_distance,
		"retargetCount": _contact_retarget_count,
		"lastTargetPosition": _contact_last_target_position,
	}


func play_speech_blip(max_distance_m: float) -> void:
	if max_distance_m <= 0.0 or _speech_blip.stream == null:
		return
	_speech_blip.max_distance = clampf(max_distance_m, 1.0, 24.0)
	_speech_blip.play()


func is_moving() -> bool:
	return _moving or _contact_moving or _has_pending_target or _yield_remaining > 0.0


func movement_status() -> Dictionary:
	return {
		"movementId": _movement_id,
		"anchorRef": _movement_anchor_ref,
		"moving": is_moving(),
		"mode": str(_contact_mode() if not _contact_id.is_empty() else _movement_mode),
		"targetPosition": _movement_target,
		"finalPosition": _navigation_agent.get_final_position(),
		"targetReachable": _navigation_agent.is_target_reachable(),
		"navigationFinished": _navigation_agent.is_navigation_finished(),
		"avoidanceEnabled": _navigation_agent.avoidance_enabled,
		"avoidancePriority": _navigation_agent.avoidance_priority,
		"yieldRemaining": _yield_remaining,
		"yieldCount": _yield_count,
		"repathAttempts": _repath_attempts,
		"stuckRecoveryCount": _stuck_recovery_count,
		"lastRecoveryReason": _last_recovery_reason,
		"lookHoldRemaining": _look_hold_remaining,
		"inferredDynamicYieldCount": _inferred_dynamic_yield_count,
		"ambient": {
			"enabled": ambient_wander_enabled,
			"suspended": _ambient_suspended,
			"policyHeld": _ambient_policy_held,
			"center": _ambient_center,
			"dwellRemaining": _ambient_dwell_remaining,
			"cycleCount": _ambient_cycle_count,
			"reselectionCount": _ambient_reselection_count,
			"selectionFailureCount": _ambient_selection_failure_count,
		},
	}


func set_policy_state(state: StringName) -> void:
	if not POLICY_ANIMATIONS.has(state):
		push_error("NPC3D received unsupported presentation policy state: %s" % state)
		return
	_policy_state = state
	_play_policy_state()


func policy_state() -> StringName:
	return _policy_state


func get_interaction_label_key() -> StringName:
	return &"hud.interaction.npc"


func get_interaction_target_key() -> StringName:
	return label_key


func interaction_kind() -> StringName:
	return &"npc"


func is_interaction_enabled() -> bool:
	if _contact_id.is_empty():
		return conversation_enabled
	return conversation_enabled and player_contact_is_ready(_contact_id)


func interact(_interactor: Node3D) -> void:
	if not is_interaction_enabled():
		return
	conversation_requested.emit(actor_id)


func _begin_pending_move() -> void:
	_navigation_agent.target_position = _pending_target
	_has_pending_target = false
	_movement_mode = _pending_move_mode
	_pending_move_mode = MOVE_NONE
	_moving = true
	velocity.x = 0.0
	velocity.z = 0.0
	_navigation_agent.avoidance_enabled = true
	_navigation_agent.max_speed = walk_speed
	_reset_progress_tracking(STUCK_GRACE_SECONDS)
	set_policy_state(POLICY_WALK)


func _complete_move() -> void:
	var completed_movement_id := _movement_id
	var completed_anchor_ref := _movement_anchor_ref
	var completed_mode := _movement_mode
	var final_position := _navigation_agent.get_final_position()
	var reached_final := _planar_distance(global_position, final_position) <= 0.85
	var reached_target := _planar_distance(final_position, _movement_target) <= 0.05
	var reached := reached_final and reached_target
	_cancel_navigation_motion()
	_movement_id = ""
	_movement_anchor_ref = ""
	_movement_target = Vector3.ZERO
	if completed_mode == MOVE_COMMAND and not completed_movement_id.is_empty() and reached:
		_ambient_center = global_position
		_ambient_suspended = false
		_schedule_ambient_dwell(false)
		movement_arrived.emit(completed_movement_id, actor_id, completed_anchor_ref)
	elif completed_mode == MOVE_COMMAND and not completed_movement_id.is_empty():
		_ambient_suspended = true
		push_warning(
			"NPC %s could not reach projected runtime anchor %s; arrival not emitted."
			% [actor_id, completed_anchor_ref]
		)
		movement_blocked.emit(
			completed_movement_id,
			actor_id,
			completed_anchor_ref,
			"navigation_unreachable"
		)
	elif completed_mode == MOVE_CONTACT_RETURN:
		_ambient_center = global_position
		_ambient_suspended = false
		_schedule_ambient_dwell(false)
	else:
		# Ambient destinations are presentation-only. An unreachable local point
		# is discarded and replaced after a short dwell; it never becomes a
		# runtime arrival or a teleport.
		_ambient_suspended = false
		_schedule_ambient_dwell(not reached)


func _planar_distance(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()


func _navigation_map_is_synchronized() -> bool:
	var navigation_map := _navigation_agent.get_navigation_map()
	return (
		navigation_map.is_valid()
		and NavigationServer3D.map_get_iteration_id(navigation_map) > 0
	)


func _on_velocity_computed(safe_velocity: Vector3) -> void:
	if (_yield_remaining > 0.0) or (not _moving and not _contact_moving):
		return
	var planar_velocity := Vector2(safe_velocity.x, safe_velocity.z)
	if planar_velocity.length() > walk_speed:
		planar_velocity = planar_velocity.normalized() * walk_speed
	if not planar_velocity.is_zero_approx():
		_face_movement_direction(
			Vector3(planar_velocity.x, 0.0, planar_velocity.y).normalized(),
			get_physics_process_delta_time()
		)
	velocity.x = planar_velocity.x
	velocity.z = planar_velocity.y
	move_and_slide()


func _process_player_contact(delta: float) -> void:
	if not is_instance_valid(_contact_target):
		cancel_player_contact()
		move_and_slide()
		return
	if _yield_remaining > 0.0:
		_process_yield(delta)
		move_and_slide()
		return
	var target_position := _contact_target.global_position
	var planar_distance := _planar_distance(global_position, target_position)
	if (
		planar_distance <= _contact_safe_distance + 0.15
		and _contact_has_line_of_sight()
	):
		_contact_moving = false
		_movement_mode = MOVE_NONE
		_navigation_agent.avoidance_enabled = false
		_navigation_agent.velocity = Vector3.ZERO
		velocity.x = 0.0
		velocity.z = 0.0
		set_policy_state(POLICY_IDLE)
		face_position(target_position + Vector3.UP * 1.35)
		_contact_ready_emitted = true
		_reset_progress_tracking()
		if not _contact_ready_signaled:
			_contact_ready_signaled = true
			player_contact_ready.emit(_contact_id, actor_id)
		move_and_slide()
		return

	_contact_retarget_remaining = maxf(0.0, _contact_retarget_remaining - delta)
	var target_moved := (
		_contact_last_target_position.x == INF
		or _planar_distance(target_position, _contact_last_target_position)
		>= CONTACT_RETARGET_DISTANCE_M
	)
	if (
		is_zero_approx(_contact_retarget_remaining)
		and target_moved
		and _navigation_map_is_synchronized()
	):
		var navigation_map := _navigation_agent.get_navigation_map()
		var projected_target := NavigationServer3D.map_get_closest_point(
			navigation_map,
			target_position
		)
		_navigation_agent.target_position = projected_target
		_movement_target = projected_target
		_contact_last_target_position = target_position
		_contact_retarget_remaining = CONTACT_RETARGET_SECONDS
		_contact_retarget_count += 1
		_contact_moving = true
		_movement_mode = MOVE_CONTACT
		_contact_ready_emitted = false
		_navigation_agent.avoidance_enabled = true
		_navigation_agent.max_speed = walk_speed
		_reset_progress_tracking(STUCK_GRACE_SECONDS)
		set_policy_state(POLICY_WALK)
		# Let NavigationServer3D synchronize the refreshed target before querying.
		move_and_slide()
		return

	if not _contact_moving:
		velocity.x = 0.0
		velocity.z = 0.0
		move_and_slide()
		return
	if _navigation_agent.is_navigation_finished():
		# Reaching the projected player point without safe-distance line of sight
		# usually means a body or narrow portal won. Yield, then refresh the
		# moving target instead of vibrating or forcing a teleport.
		_repath_attempts += 1
		_begin_yield(MOVE_CONTACT, "contact_endpoint_blocked")
		move_and_slide()
		return
	if _track_motion_progress(delta):
		_recover_from_stuck_motion()
		move_and_slide()
		return
	var next_path_position := _navigation_agent.get_next_path_position()
	var desired_direction := next_path_position - global_position
	desired_direction.y = 0.0
	if not desired_direction.is_zero_approx():
		desired_direction = desired_direction.normalized()
	_navigation_agent.velocity = desired_direction * walk_speed


func _queue_navigation_move(target_position: Vector3, mode: StringName) -> void:
	if _moving or _has_pending_target or _yield_remaining > 0.0:
		_cancel_navigation_motion()
	_pending_target = target_position
	_has_pending_target = true
	_pending_move_mode = mode
	_movement_target = target_position
	_repath_attempts = 0
	_inferred_dynamic_yield_count = 0


func _cancel_navigation_motion() -> void:
	_has_pending_target = false
	_pending_move_mode = MOVE_NONE
	_moving = false
	_movement_mode = MOVE_NONE
	_yield_remaining = 0.0
	_yield_resume_mode = MOVE_NONE
	_navigation_agent.avoidance_enabled = false
	_navigation_agent.velocity = Vector3.ZERO
	velocity.x = 0.0
	velocity.z = 0.0
	_reset_progress_tracking()
	set_policy_state(POLICY_IDLE)


func _tick_ambient_wander(delta: float) -> void:
	if not ambient_wander_enabled or _ambient_suspended or _ambient_policy_held:
		return
	if not _navigation_map_is_synchronized():
		return
	_ambient_dwell_remaining = maxf(0.0, _ambient_dwell_remaining - delta)
	if not is_zero_approx(_ambient_dwell_remaining):
		return
	var target_value: Variant = _select_ambient_target()
	if not target_value is Vector3:
		_ambient_selection_failure_count += 1
		_schedule_ambient_dwell(true)
		return
	_ambient_cycle_count += 1
	_queue_navigation_move(target_value as Vector3, MOVE_AMBIENT)


func _select_ambient_target() -> Variant:
	var navigation_map := _navigation_agent.get_navigation_map()
	var origin := NavigationServer3D.map_get_closest_point(
		navigation_map,
		global_position
	)
	var minimum_radius := maxf(AMBIENT_MIN_DISPLACEMENT_M, ambient_wander_radius * 0.5)
	for _attempt in range(AMBIENT_TARGET_ATTEMPTS):
		var angle := _ambient_rng.randf_range(0.0, TAU)
		var distance := _ambient_rng.randf_range(minimum_radius, ambient_wander_radius)
		var raw_target := _ambient_center + Vector3(cos(angle), 0.0, sin(angle)) * distance
		var projected_target := NavigationServer3D.map_get_closest_point(
			navigation_map,
			raw_target
		)
		if _planar_distance(projected_target, raw_target) > AMBIENT_PROJECTION_TOLERANCE_M:
			continue
		if _planar_distance(projected_target, _ambient_center) > ambient_wander_radius + 0.2:
			continue
		if _planar_distance(projected_target, global_position) < AMBIENT_MIN_DISPLACEMENT_M:
			continue
		if not _ambient_destination_has_clearance(projected_target):
			continue
		var path := NavigationServer3D.map_get_path(
			navigation_map,
			origin,
			projected_target,
			true,
			_navigation_agent.navigation_layers
		)
		if path.size() < 2:
			continue
		if _path_length(path) > ambient_wander_radius * AMBIENT_PATH_LENGTH_FACTOR:
			continue
		return projected_target
	return null


func _ambient_destination_has_clearance(target_position: Vector3) -> bool:
	for actor_value in get_tree().get_nodes_in_group(&"npc_actors"):
		if not actor_value is NPC3D or actor_value == self:
			continue
		var other := actor_value as NPC3D
		if _planar_distance(target_position, other.global_position) < DESTINATION_CLEARANCE_M:
			return false
		var other_status := other.movement_status()
		if (
			bool(other_status.get("moving", false))
			and _planar_distance(
				target_position,
				other_status.get("targetPosition", other.global_position) as Vector3
			) < DESTINATION_CLEARANCE_M
		):
			return false
	for group_name in [&"player", &"physical_props"]:
		for candidate_value in get_tree().get_nodes_in_group(group_name):
			if not candidate_value is Node3D:
				continue
			var candidate := candidate_value as Node3D
			if not _is_dynamic_navigation_body(candidate):
				continue
			var clearance := (
				DESTINATION_CLEARANCE_M + 0.25
				if group_name == &"player"
				else DESTINATION_CLEARANCE_M
			)
			if _planar_distance(target_position, candidate.global_position) < clearance:
				return false
	return true


func _path_length(path: PackedVector3Array) -> float:
	var total := 0.0
	for index in range(1, path.size()):
		total += path[index - 1].distance_to(path[index])
	return total


func _schedule_ambient_dwell(short_retry: bool) -> void:
	if _ambient_suspended or _ambient_policy_held or not ambient_wander_enabled:
		_ambient_dwell_remaining = 0.0
		return
	if short_retry:
		_ambient_dwell_remaining = _ambient_rng.randf_range(0.45, 1.0)
		return
	var minimum := minf(ambient_dwell_min_seconds, ambient_dwell_max_seconds)
	var maximum := maxf(ambient_dwell_min_seconds, ambient_dwell_max_seconds)
	_ambient_dwell_remaining = _ambient_rng.randf_range(minimum, maximum)


func _reset_progress_tracking(grace_seconds := 0.0) -> void:
	_progress_sample_remaining = PROGRESS_SAMPLE_SECONDS
	_progress_grace_remaining = maxf(0.0, grace_seconds)
	_stuck_elapsed = 0.0
	_progress_sample_position = global_position


func _track_motion_progress(delta: float) -> bool:
	if _progress_grace_remaining > 0.0:
		_progress_grace_remaining = maxf(0.0, _progress_grace_remaining - delta)
		_progress_sample_position = global_position
		return false
	_progress_sample_remaining = maxf(0.0, _progress_sample_remaining - delta)
	if not is_zero_approx(_progress_sample_remaining):
		return false
	var progress := _planar_distance(global_position, _progress_sample_position)
	_progress_sample_position = global_position
	_progress_sample_remaining = PROGRESS_SAMPLE_SECONDS
	if progress >= STUCK_MIN_PROGRESS_M:
		_stuck_elapsed = 0.0
		return false
	_stuck_elapsed += PROGRESS_SAMPLE_SECONDS
	return _stuck_elapsed >= STUCK_TRIGGER_SECONDS


func _recover_from_stuck_motion() -> void:
	_stuck_recovery_count += 1
	match _movement_mode:
		MOVE_COMMAND:
			var dynamic_blocker := _dynamic_command_blocker()
			var blocker_value: Variant = dynamic_blocker.get("body")
			var direct_collision := bool(dynamic_blocker.get("directCollision", false))
			var path_local_occupancy := bool(
				dynamic_blocker.get("pathLocalOccupancy", false)
			)
			var may_yield_for_dynamic := (
				blocker_value is Node3D
				and (
					direct_collision
					or path_local_occupancy
					or _inferred_dynamic_yield_count < MAX_INFERRED_DYNAMIC_YIELDS
				)
			)
			if may_yield_for_dynamic:
				# A player or another resident is transient world state, not proof
				# that the authored route is unreachable. Yield without consuming
				# the finite static-path replan budget when physics actually observed
				# the body. Endpoint/forward proximity gets one speculative yield;
				# after that, a distant body cannot mask a static cage forever.
				if not direct_collision and not path_local_occupancy:
					_inferred_dynamic_yield_count += 1
				var blocker := blocker_value as Node3D
				_begin_yield(
					MOVE_COMMAND,
					"command_dynamic_body_blocked:%s" % blocker.get_path()
				)
			elif _repath_attempts < MAX_LOCAL_REPATH_ATTEMPTS:
				_repath_attempts += 1
				_begin_yield(MOVE_COMMAND, "command_body_blocked")
			else:
				_block_runtime_movement("navigation_stuck")
		MOVE_CONTACT:
			_repath_attempts += 1
			_begin_yield(MOVE_CONTACT, "contact_body_blocked")
		MOVE_CONTACT_RETURN:
			if _repath_attempts < MAX_LOCAL_REPATH_ATTEMPTS:
				_repath_attempts += 1
				_begin_yield(MOVE_CONTACT_RETURN, "contact_return_blocked")
			else:
				_cancel_navigation_motion()
				_ambient_center = global_position
				_ambient_suspended = false
				_schedule_ambient_dwell(true)
		_:
			_ambient_reselection_count += 1
			_begin_yield(MOVE_AMBIENT, "ambient_body_blocked")


func _dynamic_command_blocker() -> Dictionary:
	for collision_index in get_slide_collision_count():
		var collision := get_slide_collision(collision_index)
		if collision == null:
			continue
		var collider_value: Variant = collision.get_collider()
		if collider_value is Node3D and _is_dynamic_navigation_body(
			collider_value as Node3D
		):
			return {
				"body": collider_value as Node3D,
				"directCollision": true,
				"pathLocalOccupancy": true,
			}

	var next_path_delta := _navigation_agent.get_next_path_position() - global_position
	next_path_delta.y = 0.0
	var next_path_direction := next_path_delta.normalized()
	var within_arrival_radius := (
		_planar_distance(global_position, _movement_target)
		<= DESTINATION_CLEARANCE_M + 0.25
	)
	for group_name in [&"npc_actors", &"player", &"physical_props"]:
		for candidate_value in get_tree().get_nodes_in_group(group_name):
			if not candidate_value is Node3D or candidate_value == self:
				continue
			var candidate := candidate_value as Node3D
			if not _is_dynamic_navigation_body(candidate):
				continue
			var candidate_delta := candidate.global_position - global_position
			candidate_delta.y = 0.0
			var candidate_distance := candidate_delta.length()
			var occupies_target := _planar_distance(
				candidate.global_position,
				_movement_target
			) < DESTINATION_CLEARANCE_M
			var blocks_forward_motion := (
				candidate_distance < DESTINATION_CLEARANCE_M + 0.25
				and (
					next_path_direction.is_zero_approx()
					or next_path_direction.dot(candidate_delta.normalized()) > 0.25
				)
			)
			if occupies_target or blocks_forward_motion:
				return {
					"body": candidate,
					"directCollision": false,
					"pathLocalOccupancy": (
						blocks_forward_motion
						or (occupies_target and within_arrival_radius)
					),
				}
	return {}


func _face_movement_direction(desired_direction: Vector3, delta: float) -> void:
	if _look_hold_remaining > 0.0:
		return
	var target_yaw := atan2(-desired_direction.x, -desired_direction.z)
	rotation.y = rotate_toward(
		rotation.y,
		target_yaw,
		TURN_SPEED_RADIANS_PER_SECOND * maxf(delta, 0.0)
	)


func _is_dynamic_navigation_body(candidate: Node3D) -> bool:
	if candidate.is_in_group(&"npc_actors") or candidate.is_in_group(&"player"):
		return true
	return (
		candidate is RigidBody3D
		and candidate.is_in_group(&"physical_props")
		and (candidate as RigidBody3D).collision_layer != 0
	)


func _begin_yield(resume_mode: StringName, reason: String) -> void:
	_yield_resume_mode = resume_mode
	_yield_remaining = _ambient_rng.randf_range(YIELD_MIN_SECONDS, YIELD_MAX_SECONDS)
	_yield_count += 1
	_last_recovery_reason = reason
	_has_pending_target = false
	_pending_move_mode = MOVE_NONE
	_moving = false
	_contact_moving = false
	# Keep the yielding body registered at zero velocity so other moving agents
	# can route around it while this NPC waits its turn.
	_navigation_agent.avoidance_enabled = true
	_navigation_agent.velocity = Vector3.ZERO
	velocity.x = 0.0
	velocity.z = 0.0
	set_policy_state(POLICY_IDLE)


func _process_yield(delta: float) -> void:
	_yield_remaining = maxf(0.0, _yield_remaining - delta)
	_navigation_agent.velocity = Vector3.ZERO
	velocity.x = 0.0
	velocity.z = 0.0
	if not is_zero_approx(_yield_remaining):
		return
	var resume_mode := _yield_resume_mode
	_yield_resume_mode = MOVE_NONE
	match resume_mode:
		MOVE_COMMAND, MOVE_CONTACT_RETURN:
			_resume_current_navigation_target(resume_mode)
		MOVE_CONTACT:
			_movement_mode = MOVE_NONE
			_contact_last_target_position = Vector3(INF, INF, INF)
			_contact_retarget_remaining = 0.0
			_contact_moving = false
			_reset_progress_tracking()
		_:
			_cancel_navigation_motion()
			_movement_target = Vector3.ZERO
			_ambient_suspended = false
			_schedule_ambient_dwell(true)


func _resume_current_navigation_target(mode: StringName) -> void:
	_navigation_agent.target_position = _movement_target
	_movement_mode = mode
	_moving = true
	_navigation_agent.avoidance_enabled = true
	_navigation_agent.max_speed = walk_speed
	_reset_progress_tracking(STUCK_GRACE_SECONDS)
	set_policy_state(POLICY_WALK)


func _block_runtime_movement(reason: String) -> void:
	var blocked_movement_id := _movement_id
	var blocked_anchor_ref := _movement_anchor_ref
	var blocked_position := global_position
	var blocked_target := _movement_target
	var blocked_final_position := _navigation_agent.get_final_position()
	var blocked_target_reachable := _navigation_agent.is_target_reachable()
	var blocked_navigation_finished := _navigation_agent.is_navigation_finished()
	var blocker_path := _latest_slide_blocker_path()
	_cancel_navigation_motion()
	_ambient_suspended = true
	_movement_id = ""
	_movement_anchor_ref = ""
	_movement_target = Vector3.ZERO
	_last_recovery_reason = reason
	if blocked_movement_id.is_empty():
		return
	push_warning(
		(
			"NPC %s stayed blocked en route to %s after %d local replans; "
			+ "position=%s target=%s final=%s reachable=%s finished=%s blocker=%s."
		)
		% [
			actor_id,
			blocked_anchor_ref,
			MAX_LOCAL_REPATH_ATTEMPTS,
			blocked_position,
			blocked_target,
			blocked_final_position,
			blocked_target_reachable,
			blocked_navigation_finished,
			blocker_path,
		]
	)
	movement_blocked.emit(
		blocked_movement_id,
		actor_id,
		blocked_anchor_ref,
		reason
	)


func _latest_slide_blocker_path() -> String:
	for collision_index in get_slide_collision_count():
		var collision := get_slide_collision(collision_index)
		if collision == null:
			continue
		var collider_value: Variant = collision.get_collider()
		if collider_value is Node:
			return str((collider_value as Node).get_path())
	return "none"


func _contact_mode() -> StringName:
	if _yield_remaining > 0.0:
		return &"contact_yield"
	if _contact_moving:
		return MOVE_CONTACT
	if _contact_ready_emitted:
		return &"contact_ready"
	return &"contact_wait"


func _contact_has_line_of_sight() -> bool:
	if not is_instance_valid(_contact_target):
		return false
	var source_eye := global_position + Vector3.UP * 1.35
	var target_eye := _contact_target.global_position + Vector3.UP * 1.35
	var query := PhysicsRayQueryParameters3D.create(source_eye, target_eye)
	query.collide_with_areas = false
	query.collide_with_bodies = true
	query.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return false
	var collider_value: Variant = hit.get("collider")
	if not collider_value is Node:
		return false
	var current := collider_value as Node
	while current != null:
		if current == _contact_target:
			return true
		current = current.get_parent()
	return false


func _clear_contact_state() -> void:
	_contact_id = ""
	_contact_target = null
	_contact_safe_distance = 1.6
	_contact_retarget_remaining = 0.0
	_contact_last_target_position = Vector3(INF, INF, INF)
	_contact_moving = false
	_contact_ready_emitted = false
	_contact_ready_signaled = false
	_contact_retarget_count = 0


func _instantiate_character() -> void:
	if character_scene == null:
		return
	var instance := character_scene.instantiate()
	if not instance is Node3D:
		push_error("NPC3D character_scene root must be Node3D.")
		if instance != null:
			instance.free()
		return
	var character := instance as Node3D
	var forbidden_node := _find_visible_weapon_node(character)
	if forbidden_node != null:
		push_error(
			"NPC3D rejected character_scene with visible weapon node: %s"
			% forbidden_node.name
		)
		character.free()
		return
	character.scale = Vector3.ONE * AssetScales.CHARACTERS
	_visual_root.add_child(character)
	_animation_player = _find_animation_player(character)
	if _animation_player == null:
		push_error("NPC3D character_scene has no AnimationPlayer.")
		return
	for animation_name: StringName in POLICY_ANIMATIONS.values():
		if not _animation_player.has_animation(animation_name):
			push_error("NPC3D character_scene is missing animation: %s" % animation_name)


func _apply_role_accent() -> void:
	var material := StandardMaterial3D.new()
	material.albedo_color = accent
	material.roughness = 0.85
	_role_accent.material_override = material


func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node as AnimationPlayer
	for child in node.get_children():
		var found := _find_animation_player(child)
		if found != null:
			return found
	return null


func _find_visible_weapon_node(node: Node) -> Node:
	if _name_has_weapon_token(node.name) and _contains_visible_geometry(node):
		return node
	for child in node.get_children():
		var found := _find_visible_weapon_node(child)
		if found != null:
			return found
	return null


func _name_has_weapon_token(node_name: StringName) -> bool:
	var normalized := str(node_name).to_lower()
	for token in WEAPON_NAME_TOKENS:
		if normalized.contains(token):
			return true
	return false


func _contains_visible_geometry(node: Node) -> bool:
	if node is Node3D and not (node as Node3D).visible:
		return false
	if node is GeometryInstance3D:
		return true
	for child in node.get_children():
		if _contains_visible_geometry(child):
			return true
	return false


func _play_policy_state() -> void:
	if _animation_player == null:
		return
	var animation_name: StringName = POLICY_ANIMATIONS[_policy_state]
	if _animation_player.has_animation(animation_name):
		_animation_player.play(animation_name)


func _build_speech_blip() -> AudioStreamWAV:
	var sample_count := roundi(SPEECH_BLIP_MIX_RATE * SPEECH_BLIP_SECONDS)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for sample_index in sample_count:
		var time_seconds := float(sample_index) / float(SPEECH_BLIP_MIX_RATE)
		var progress := float(sample_index) / float(maxi(1, sample_count - 1))
		var envelope := sin(PI * progress)
		var carrier := (
			sin(TAU * SPEECH_BLIP_FREQUENCY_HZ * time_seconds)
			+ 0.35 * sin(TAU * SPEECH_BLIP_FREQUENCY_HZ * 1.5 * time_seconds)
		)
		var sample := clampi(roundi(carrier * envelope * 9000.0), -32768, 32767)
		bytes.encode_s16(sample_index * 2, sample)
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = SPEECH_BLIP_MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream
