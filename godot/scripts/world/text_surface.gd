extends Area3D

@export var surface_id: StringName
@export var display_name := "TextSurface"
@export var landmark := ""
@export var law_id := ""
@export var cover_test_id := ""
@export_multiline var purpose := ""
@export_multiline var body := ""
@export var evidence_outputs: Array[String] = []

@onready var _readable_text: Label3D = $ReadableText

func _ready() -> void:
	add_to_group("text_surfaces")
	add_to_group("localized_nodes")
	_apply_text()
	_apply_metadata()

func configure(surface_data: Dictionary) -> void:
	surface_id = StringName(surface_data.get("id", "TS_Unknown"))
	display_name = str(surface_data.get("label", surface_id))
	landmark = str(surface_data.get("landmark", ""))
	law_id = str(surface_data.get("law_id", ""))
	cover_test_id = str(surface_data.get("cover_test_id", ""))
	purpose = str(surface_data.get("purpose", ""))
	body = str(surface_data.get("body", ""))
	evidence_outputs.clear()
	for output in surface_data.get("evidence_outputs", []):
		evidence_outputs.append(str(output))
	name = "TextSurface_%s" % String(surface_id)
	_apply_metadata()
	if is_node_ready():
		_apply_text()

func _apply_text() -> void:
	_readable_text.text = "%s\n%s\n%s" % [
		_localized("text_surface.%s.label" % String(surface_id), display_name),
		law_id,
		_localized("text_surface.%s.body" % String(surface_id), body)
	]

func _apply_metadata() -> void:
	set_meta("surface_id", String(surface_id))
	set_meta("landmark", landmark)
	set_meta("law_id", law_id)
	set_meta("cover_test_id", cover_test_id)
	set_meta("purpose", purpose)
	set_meta("body", body)
	set_meta("evidence_outputs", evidence_outputs)

func interaction_summary() -> String:
	return "%s: %s" % [String(surface_id), body]

func refresh_locale() -> void:
	_apply_text()

func localized_display_name() -> String:
	return _localized("text_surface.%s.label" % String(surface_id), display_name)

func localized_body() -> String:
	return _localized("text_surface.%s.body" % String(surface_id), body)

func _localized(key: String, fallback: String) -> String:
	var translated := str(TranslationServer.translate(StringName(key)))
	return fallback if translated == key else translated
