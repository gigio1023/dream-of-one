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

@export var actor_id: StringName
@export var label_key: StringName
@export var role_key: StringName
@export var accent := Color(0.82, 0.82, 0.82)
@export var character_scene: PackedScene
@export var conversation_enabled := false
@export_range(0.1, 8.0, 0.1, "or_greater") var walk_speed := 2.2

@onready var _visual_root: Node3D = $VisualRoot
@onready var _role_accent: MeshInstance3D = $RoleAccent
@onready var _navigation_agent: NavigationAgent3D = $NavigationAgent3D
@onready var _speech_blip: AudioStreamPlayer3D = $SpeechBlip

var _animation_player: AnimationPlayer
var _policy_state: StringName = POLICY_IDLE
var _pending_target := Vector3.ZERO
var _has_pending_target := false
var _moving := false
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


func _ready() -> void:
	add_to_group(&"npc_actors")
	add_to_group(&"interactables")
	_navigation_agent.avoidance_enabled = false
	_default_target_desired_distance = _navigation_agent.target_desired_distance
	_navigation_agent.velocity_computed.connect(_on_velocity_computed)
	_apply_role_accent()
	_instantiate_character()
	_speech_blip.stream = _build_speech_blip()
	_play_policy_state()


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity += get_gravity() * delta
	elif velocity.y < 0.0:
		velocity.y = 0.0

	if not _contact_id.is_empty():
		_process_player_contact(delta)
		return

	if _has_pending_target and _navigation_map_is_synchronized():
		_begin_pending_move()
		# NavigationServer3D applies the new target on its next synchronization.
		# Do not query the path in the same physics tick that submits it.
		move_and_slide()
		return

	if not _moving:
		velocity.x = 0.0
		velocity.z = 0.0
		move_and_slide()
		return

	if _navigation_agent.is_navigation_finished():
		_complete_move()
		move_and_slide()
		return

	var next_path_position := _navigation_agent.get_next_path_position()
	var desired_direction := next_path_position - global_position
	desired_direction.y = 0.0
	if not desired_direction.is_zero_approx():
		desired_direction = desired_direction.normalized()
		look_at(global_position + desired_direction, Vector3.UP)
	_navigation_agent.velocity = desired_direction * walk_speed


func move_to(target_position: Vector3) -> void:
	_pending_target = target_position
	_has_pending_target = true


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
	_movement_id = movement_id
	_movement_anchor_ref = anchor_ref
	_movement_target = projected_target
	move_to(projected_target)
	return true


func stop() -> void:
	_clear_contact_state()
	_has_pending_target = false
	_moving = false
	_navigation_agent.avoidance_enabled = false
	_navigation_agent.velocity = Vector3.ZERO
	_navigation_agent.target_desired_distance = _default_target_desired_distance
	velocity.x = 0.0
	velocity.z = 0.0
	set_policy_state(POLICY_IDLE)
	_movement_id = ""
	_movement_anchor_ref = ""
	_movement_target = Vector3.ZERO


func face_position(target_position: Vector3) -> void:
	var flat_target := Vector3(target_position.x, global_position.y, target_position.z)
	if not flat_target.is_equal_approx(global_position):
		look_at(flat_target, Vector3.UP)


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
	_navigation_agent.target_desired_distance = _contact_safe_distance
	set_policy_state(POLICY_WALK)
	return true


func cancel_player_contact(return_position: Variant = null) -> void:
	if _contact_id.is_empty():
		return
	_clear_contact_state()
	_has_pending_target = false
	_moving = false
	_navigation_agent.avoidance_enabled = false
	_navigation_agent.velocity = Vector3.ZERO
	_navigation_agent.target_desired_distance = _default_target_desired_distance
	velocity.x = 0.0
	velocity.z = 0.0
	set_policy_state(POLICY_IDLE)
	if return_position is Vector3:
		# This is only visual recovery after an authoritative contact cancellation.
		# It carries no runtime movement id and therefore cannot emit an arrival.
		_movement_id = ""
		_movement_anchor_ref = ""
		_movement_target = return_position as Vector3
		move_to(return_position as Vector3)


func has_player_contact(contact_id := "") -> bool:
	return (
		not _contact_id.is_empty()
		and (contact_id.is_empty() or contact_id == _contact_id)
	)


func player_contact_is_ready(contact_id: String) -> bool:
	return contact_id == _contact_id and _contact_ready_emitted


func contact_status() -> Dictionary:
	return {
		"contactId": _contact_id,
		"active": not _contact_id.is_empty(),
		"moving": _contact_moving,
		"ready": _contact_ready_emitted,
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
	return _moving or _contact_moving


func movement_status() -> Dictionary:
	return {
		"movementId": _movement_id,
		"anchorRef": _movement_anchor_ref,
		"moving": _moving or _has_pending_target,
		"targetPosition": _movement_target,
		"finalPosition": _navigation_agent.get_final_position(),
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
	return conversation_enabled


func interact(_interactor: Node3D) -> void:
	if not conversation_enabled:
		return
	conversation_requested.emit(actor_id)


func _begin_pending_move() -> void:
	_navigation_agent.target_position = _pending_target
	_has_pending_target = false
	_moving = true
	velocity.x = 0.0
	velocity.z = 0.0
	_navigation_agent.avoidance_enabled = true
	set_policy_state(POLICY_WALK)


func _complete_move() -> void:
	var completed_movement_id := _movement_id
	var completed_anchor_ref := _movement_anchor_ref
	var final_position := _navigation_agent.get_final_position()
	var reached_final := _planar_distance(global_position, final_position) <= 0.85
	var reached_target := _planar_distance(final_position, _movement_target) <= 0.05
	stop()
	if not completed_movement_id.is_empty() and reached_final and reached_target:
		movement_arrived.emit(completed_movement_id, actor_id, completed_anchor_ref)
	elif not completed_movement_id.is_empty():
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


func _planar_distance(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()


func _navigation_map_is_synchronized() -> bool:
	var navigation_map := _navigation_agent.get_navigation_map()
	return (
		navigation_map.is_valid()
		and NavigationServer3D.map_get_iteration_id(navigation_map) > 0
	)


func _on_velocity_computed(safe_velocity: Vector3) -> void:
	if not _moving and not _contact_moving:
		return
	velocity.x = safe_velocity.x
	velocity.z = safe_velocity.z
	move_and_slide()


func _process_player_contact(delta: float) -> void:
	if not is_instance_valid(_contact_target):
		cancel_player_contact()
		move_and_slide()
		return
	var target_position := _contact_target.global_position
	var planar_distance := _planar_distance(global_position, target_position)
	if (
		planar_distance <= _contact_safe_distance + 0.15
		and _contact_has_line_of_sight()
	):
		_contact_moving = false
		_navigation_agent.avoidance_enabled = false
		_navigation_agent.velocity = Vector3.ZERO
		velocity.x = 0.0
		velocity.z = 0.0
		set_policy_state(POLICY_IDLE)
		face_position(target_position + Vector3.UP * 1.35)
		_contact_ready_emitted = true
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
		_contact_last_target_position = target_position
		_contact_retarget_remaining = CONTACT_RETARGET_SECONDS
		_contact_retarget_count += 1
		_contact_moving = true
		_contact_ready_emitted = false
		_navigation_agent.avoidance_enabled = true
		set_policy_state(POLICY_WALK)
		# Let NavigationServer3D synchronize the refreshed target before querying.
		move_and_slide()
		return

	if not _contact_moving or _navigation_agent.is_navigation_finished():
		velocity.x = 0.0
		velocity.z = 0.0
		move_and_slide()
		return
	var next_path_position := _navigation_agent.get_next_path_position()
	var desired_direction := next_path_position - global_position
	desired_direction.y = 0.0
	if not desired_direction.is_zero_approx():
		desired_direction = desired_direction.normalized()
		look_at(global_position + desired_direction, Vector3.UP)
	_navigation_agent.velocity = desired_direction * walk_speed


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
