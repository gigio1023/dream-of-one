extends SceneTree

## Checks the committed asset floor. Missing optional/local packs are reported
## as information because the playable build must not depend on them.

const KENNEY_ATLAS := "res://assets/kenney2d/rpg-urban-pack/Tilemap/tilemap_packed.png"
const KENNEY_LICENSE := "res://assets/kenney2d/rpg-urban-pack/License.txt"
const MANIFEST := "res://assets/third_party/manifest.json"
const COMMERCIAL_TRIM_DIR := "res://assets/kenney3d/city_commercial"
const KAYKIT_CITY_DIR := "res://assets/kaykit/city_builder_bits"
const GREYBOX_ASSETS := [
	"res://assets/greybox/queue_marker.png",
	"res://assets/greybox/store_counter.png",
	"res://assets/greybox/usual_order_cue.png",
	"res://assets/greybox/receipt_tray.png",
	"res://assets/greybox/correction_slip.png",
	"res://assets/greybox/report_tray.png",
	"res://assets/greybox/station_dossier.png",
]

var _failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	_check_file(KENNEY_ATLAS, "committed Kenney atlas")
	_check_file(KENNEY_LICENSE, "Kenney CC0 license")
	for path in GREYBOX_ASSETS:
		_check_file(path, "greybox asset")
	_check_manifest()
	_check_no_closed_commercial_buildings()
	_check_no_kaykit_city_architecture()

	if _failures.is_empty():
		print("PASS check_assets: committed 2D/3D packs, licenses, curated files, greybox assets, and manifest are valid")
		quit(0)
		return
	for failure in _failures:
		print("FAIL check_assets: %s" % failure)
	quit(1)

func _check_file(path: String, label: String) -> void:
	if not FileAccess.file_exists(path):
		_failures.append("missing %s: %s" % [label, path])
		return
	print("PASS check_assets: %s" % path)

func _check_license_text(path: String, pack_name: String) -> void:
	if not FileAccess.file_exists(path):
		return
	var text := FileAccess.get_file_as_string(path)
	if text.strip_edges().is_empty():
		_failures.append("license file is empty for %s" % pack_name)
	elif text.findn("CC0") < 0 and text.findn("Creative Commons Zero") < 0:
		_failures.append("license does not identify CC0 for %s" % pack_name)

func _check_manifest() -> void:
	if not FileAccess.file_exists(MANIFEST):
		_failures.append("missing third-party manifest: %s" % MANIFEST)
		return
	var json := JSON.new()
	var parse_error := json.parse(FileAccess.get_file_as_string(MANIFEST))
	if parse_error != OK:
		_failures.append("manifest JSON parse failed at line %d: %s" % [json.get_error_line(), json.get_error_message()])
		return
	if not json.data is Dictionary:
		_failures.append("manifest root is not an object")
		return
	var manifest: Dictionary = json.data
	if int(manifest.get("schemaVersion", 0)) < 1:
		_failures.append("manifest schemaVersion is missing or invalid")
	var packs_value: Variant = manifest.get("packs", [])
	if not packs_value is Array:
		_failures.append("manifest packs is not an array")
		return
	var packs: Array = packs_value
	if packs.is_empty():
		_failures.append("manifest contains no pack rows")
		return

	var local_rows := 0
	for pack_value in packs:
		if not pack_value is Dictionary:
			_failures.append("manifest contains a non-object pack row")
			continue
		var pack: Dictionary = pack_value
		var name := str(pack.get("name", ""))
		var tier := str(pack.get("tier", ""))
		var install_path := str(pack.get("installPath", ""))
		if name.is_empty() or tier.is_empty() or install_path.is_empty():
			_failures.append("manifest pack row is missing name/tier/installPath")
			continue
		if str(pack.get("source", "")).is_empty() or str(pack.get("license", "")).is_empty():
			_failures.append("manifest pack %s is missing source/license" % name)

		var installed := _directory_exists(install_path)
		if tier == "committed":
			if not installed and bool(pack.get("required", false)):
				_failures.append("required committed pack is missing: %s (%s)" % [name, install_path])
			else:
				print("PASS check_assets: committed pack %s installed=%s" % [name, installed])
			var license_path := str(pack.get("licensePath", ""))
			if license_path.is_empty() or not FileAccess.file_exists(license_path):
				_failures.append("committed pack license is missing: %s" % name)
			else:
				_check_license_text(license_path, name)
			_check_manifest_selection(pack, name, install_path)
		else:
			local_rows += 1
			print("INFO check_assets: local pack %s installed=%s (absence is allowed)" % [name, installed])
	if local_rows == 0:
		print("INFO check_assets: no optional local-pack rows declared; committed tier is self-sufficient")

func _check_manifest_selection(pack: Dictionary, pack_name: String, install_path: String) -> void:
	var selected_assets: Variant = pack.get("selectedAssets", [])
	if selected_assets is Array:
		for relative_path_value in selected_assets:
			var relative_path := str(relative_path_value)
			_check_file(install_path.path_join(relative_path), "selected file for %s" % pack_name)
	var selected_hashes: Variant = pack.get("selectedFileSha256", {})
	if selected_hashes is Dictionary:
		for relative_path_value in (selected_hashes as Dictionary).keys():
			var relative_path := str(relative_path_value)
			_check_file(install_path.path_join(relative_path), "selected file for %s" % pack_name)

func _check_no_closed_commercial_buildings() -> void:
	if not _directory_exists(COMMERCIAL_TRIM_DIR):
		return
	for file_name in DirAccess.get_files_at(COMMERCIAL_TRIM_DIR):
		var normalized := file_name.to_lower().replace("-", "_")
		if normalized.begins_with("building_") or normalized.begins_with("low_detail_building_"):
			_failures.append("closed City Kit building mesh is forbidden in the enterable town: %s" % file_name)

func _check_no_kaykit_city_architecture() -> void:
	if not _directory_exists(KAYKIT_CITY_DIR):
		return
	for file_name in DirAccess.get_files_at(KAYKIT_CITY_DIR):
		var normalized := file_name.to_lower().replace("-", "_")
		if (
			normalized.begins_with("building_")
			or normalized.begins_with("road_")
			or normalized.begins_with("base_")
			or normalized.begins_with("base.")
		):
			_failures.append("KayKit City architecture is forbidden in the enterable town: %s" % file_name)

func _directory_exists(path: String) -> bool:
	return DirAccess.dir_exists_absolute(ProjectSettings.globalize_path(path))
