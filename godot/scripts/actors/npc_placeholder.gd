extends CharacterBody3D

@export var npc_id: StringName
@export var display_name := "NPC"
@export var role := "Placeholder"
@export var home_landmark := ""
@export var route_id := ""

var _pressure_line := ""
var _pressure_line_key := ""
var _pressure_line_args: Dictionary = {}

@onready var _name_label: Label3D = $NameLabel
@onready var _pressure_label: Label3D = $PressureLabel

func _ready() -> void:
	add_to_group("npc_placeholders")
	add_to_group("localized_nodes")
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
	_name_label.text = "%s\n%s" % [
		_localized("npc.%s.label" % String(npc_id), {}, display_name),
		_localized("npc.%s.role" % String(npc_id), {}, role)
	]

func say(line: String) -> void:
	_pressure_line = line
	_pressure_line_key = ""
	_pressure_line_args = {}
	_pressure_label.text = line

func say_key(line_key: String, args: Dictionary = {}) -> void:
	_pressure_line = ""
	_pressure_line_key = line_key
	_pressure_line_args = args.duplicate(true)
	_pressure_label.text = _localized(line_key, args)

func refresh_locale() -> void:
	_apply_label()
	if not _pressure_line_key.is_empty():
		_pressure_label.text = _localized(_pressure_line_key, _pressure_line_args)
	elif not _pressure_line.is_empty():
		_pressure_label.text = _pressure_line

func _localized(key: String, args: Dictionary = {}, fallback := "") -> String:
	var localization := _localization()
	if localization != null and localization.has_method("text"):
		return str(localization.text(key, args, fallback))
	var translated := str(TranslationServer.translate(StringName(key)))
	if translated == key and not fallback.is_empty():
		translated = fallback
	return translated.format(args)

func _localization() -> Node:
	var nodes := get_tree().get_nodes_in_group("localization_services")
	if nodes.is_empty():
		return null
	return nodes[0]
