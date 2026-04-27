extends CharacterBody3D

@export var npc_id: StringName
@export var display_name := "NPC"
@export var role := "Placeholder"
@export var home_landmark := ""
@export var route_id := ""

@onready var _name_label: Label3D = $NameLabel

func _ready() -> void:
	add_to_group("npc_placeholders")
	set_meta("npc_id", String(npc_id))
	set_meta("role", role)
	set_meta("home_landmark", home_landmark)
	set_meta("route_id", route_id)
	_apply_label()

func configure(actor_data: Dictionary) -> void:
	npc_id = StringName(actor_data.get("id", "NPC_Placeholder"))
	display_name = str(actor_data.get("label", npc_id))
	role = str(actor_data.get("role", "Placeholder"))
	home_landmark = str(actor_data.get("home_landmark", ""))
	route_id = str(actor_data.get("route_id", ""))
	name = "Actor_%s" % String(npc_id)
	set_meta("npc_id", String(npc_id))
	set_meta("role", role)
	set_meta("home_landmark", home_landmark)
	set_meta("route_id", route_id)
	if is_node_ready():
		_apply_label()

func _apply_label() -> void:
	_name_label.text = "%s\n%s" % [display_name, role]

