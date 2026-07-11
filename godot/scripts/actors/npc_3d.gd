class_name NPC3D
extends CharacterBody3D

## Reusable presentation and movement shell for one town resident.
##
## The scene root is at the actor's feet. Schedulers may request movement and
## conversations, but social state and world truth remain outside this node.

signal conversation_requested(actor_id: StringName)

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
@onready var _door_ray: RayCast3D = $DoorRay

var _animation_player: AnimationPlayer
var _policy_state: StringName = POLICY_IDLE
var _pending_target := Vector3.ZERO
var _has_pending_target := false
var _moving := false


func _ready() -> void:
	add_to_group(&"npc_actors")
	add_to_group(&"interactables")
	_navigation_agent.avoidance_enabled = false
	_navigation_agent.velocity_computed.connect(_on_velocity_computed)
	_apply_role_accent()
	_instantiate_character()
	_play_policy_state()


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity += get_gravity() * delta
	elif velocity.y < 0.0:
		velocity.y = 0.0

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
		stop()
		move_and_slide()
		return

	var next_path_position := _navigation_agent.get_next_path_position()
	var desired_direction := next_path_position - global_position
	desired_direction.y = 0.0
	if not desired_direction.is_zero_approx():
		desired_direction = desired_direction.normalized()
		look_at(global_position + desired_direction, Vector3.UP)
		_open_door_ahead()
	_navigation_agent.velocity = desired_direction * walk_speed


func move_to(target_position: Vector3) -> void:
	_pending_target = target_position
	_has_pending_target = true


func stop() -> void:
	_has_pending_target = false
	_moving = false
	_navigation_agent.avoidance_enabled = false
	_navigation_agent.velocity = Vector3.ZERO
	velocity.x = 0.0
	velocity.z = 0.0
	set_policy_state(POLICY_IDLE)


func is_moving() -> bool:
	return _moving


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


func _navigation_map_is_synchronized() -> bool:
	var navigation_map := _navigation_agent.get_navigation_map()
	return (
		navigation_map.is_valid()
		and NavigationServer3D.map_get_iteration_id(navigation_map) > 0
	)


func _on_velocity_computed(safe_velocity: Vector3) -> void:
	if not _moving:
		return
	velocity.x = safe_velocity.x
	velocity.z = safe_velocity.z
	move_and_slide()


func _open_door_ahead() -> void:
	_door_ray.force_raycast_update()
	if not _door_ray.is_colliding():
		return
	var collider := _door_ray.get_collider()
	if collider is Node and (collider as Node).has_method("open_for_npc"):
		(collider as Node).call("open_for_npc")


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
