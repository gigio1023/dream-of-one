extends CharacterBody3D

@export var npc_id: StringName
@export var display_name := "NPC"
@export var role := "Placeholder"
@export var home_landmark := ""
@export var route_id := ""

var _pressure_line := ""
var _pressure_line_key := ""
var _pressure_line_args: Dictionary = {}
var _reaction_state := "normal"
var _reaction_exposure := 0

@onready var _name_label: Label3D = $NameLabel
@onready var _pressure_label: Label3D = $PressureLabel
@onready var _reaction_label: Label3D = $ReactionLabel
@onready var _attention_disc: MeshInstance3D = $AttentionDisc

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

func set_reaction_state(state: String, exposure: int) -> void:
	_reaction_state = state
	_reaction_exposure = exposure
	_attention_disc.visible = state != "normal"
	var reaction_text := ""
	var reaction_color := Color(1.0, 0.88, 0.38, 1.0)
	match state:
		"uneasy":
			reaction_text = _localized("npc.reaction.uneasy", {}, "noticed")
			reaction_color = Color(1.0, 0.78, 0.36, 1.0)
		"probing":
			reaction_text = _localized("npc.reaction.probing", {}, "checking")
			reaction_color = Color(1.0, 0.58, 0.30, 1.0)
		"reported", "inquest":
			reaction_text = _localized("npc.reaction.reported", {}, "reported")
			reaction_color = Color(1.0, 0.38, 0.28, 1.0)
		"noted":
			reaction_text = _localized("npc.reaction.noted", {}, "note added")
			reaction_color = Color(1.0, 0.66, 0.34, 1.0)
		"paused":
			reaction_text = _localized("npc.reaction.paused", {}, "service paused")
			reaction_color = Color(1.0, 0.48, 0.28, 1.0)
		"forwarded":
			reaction_text = _localized("npc.reaction.forwarded", {}, "report forwarded")
			reaction_color = Color(1.0, 0.34, 0.28, 1.0)
		"invited":
			reaction_text = _localized("npc.reaction.invited", {}, "review open")
			reaction_color = Color(0.52, 0.78, 1.0, 1.0)
		"deferred":
			reaction_text = _localized("npc.reaction.deferred", {}, "review deferred")
			reaction_color = Color(1.0, 0.62, 0.36, 1.0)
		"blocked":
			reaction_text = _localized("npc.reaction.blocked", {}, "review blocked")
			reaction_color = Color(1.0, 0.42, 0.34, 1.0)
		"vouched":
			reaction_text = _localized("npc.reaction.vouched", {}, "public vouch")
			reaction_color = Color(0.56, 0.86, 0.56, 1.0)
		"repaired":
			reaction_text = _localized("npc.reaction.repaired", {}, "repair posted")
			reaction_color = Color(0.62, 0.78, 1.0, 1.0)
		"warned":
			reaction_text = _localized("npc.reaction.warned", {}, "warning posted")
			reaction_color = Color(1.0, 0.62, 0.28, 1.0)
		"rumored":
			reaction_text = _localized("npc.reaction.rumored", {}, "rumor posted")
			reaction_color = Color(1.0, 0.52, 0.34, 1.0)
		"helped":
			reaction_text = _localized("npc.reaction.helped", {}, "helped")
			reaction_color = Color(0.50, 0.86, 0.66, 1.0)
		"repair_accepted":
			reaction_text = _localized("npc.reaction.repair_accepted", {}, "repair accepted")
			reaction_color = Color(0.62, 0.82, 1.0, 1.0)
		"distanced":
			reaction_text = _localized("npc.reaction.distanced", {}, "keeping distance")
			reaction_color = Color(1.0, 0.70, 0.30, 1.0)
		"left":
			reaction_text = _localized("npc.reaction.left", {}, "left queue")
			reaction_color = Color(1.0, 0.54, 0.38, 1.0)
		"refused":
			reaction_text = _localized("npc.reaction.refused", {}, "refused contact")
			reaction_color = Color(1.0, 0.36, 0.32, 1.0)
		"delayed":
			reaction_text = _localized("npc.reaction.delayed", {}, "queue delayed")
			reaction_color = Color(1.0, 0.78, 0.36, 1.0)
		_:
			reaction_text = ""
	_reaction_label.text = reaction_text
	_reaction_label.modulate = reaction_color
	_pressure_label.modulate = reaction_color
	var material := _reaction_material()
	if material != null:
		material.albedo_color = Color(reaction_color.r, reaction_color.g, reaction_color.b, 0.16 + minf(float(exposure), 100.0) / 420.0)
		material.emission = Color(reaction_color.r, reaction_color.g, reaction_color.b, 1.0)
		material.emission_energy_multiplier = 0.2 + minf(float(exposure), 100.0) / 240.0

func debug_reaction_snapshot() -> Dictionary:
	var material := _reaction_material()
	return {
		"npcId": String(npc_id),
		"displayName": display_name,
		"role": role,
		"state": _reaction_state,
		"exposure": _reaction_exposure,
		"pressureText": _pressure_label.text,
		"markerVisible": _attention_disc.visible,
		"reactionText": _reaction_label.text,
		"materialAlpha": material.albedo_color.a if material != null else -1.0,
		"emissionEnergy": material.emission_energy_multiplier if material != null else -1.0
	}

func say_key(line_key: String, args: Dictionary = {}) -> void:
	_pressure_line = ""
	_pressure_line_key = line_key
	_pressure_line_args = args.duplicate(true)
	_pressure_label.text = _localized(line_key, args)

func refresh_locale() -> void:
	_apply_label()
	set_reaction_state(_reaction_state, _reaction_exposure)
	if not _pressure_line_key.is_empty():
		_pressure_label.text = _localized(_pressure_line_key, _pressure_line_args)
	elif not _pressure_line.is_empty():
		_pressure_label.text = _pressure_line

func _reaction_material() -> StandardMaterial3D:
	var material := _attention_disc.material_override
	if material == null:
		material = _attention_disc.get_surface_override_material(0)
	if material == null:
		material = _attention_disc.get_active_material(0)
	return material as StandardMaterial3D

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
