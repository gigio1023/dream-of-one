extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const EVIDENCE_OUTPUT_PATH := "res://../data/evidence/godot/shell/dre_171_shell_evidence.json"
const ShellInspector := preload("res://scripts/tools/shell_inspector.gd")
const ShellSchema := preload("res://scripts/data/shell_schema.gd")

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail(["Unable to load %s" % MAIN_SCENE])
		return

	var scene := packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame

	var inspection := ShellInspector.inspect(scene)
	var timestamp_ms := int(Time.get_unix_time_from_system() * 1000.0)
	var session_id := "dre-171-shell-session"
	var run_id := "dre-171-shell-run"
	var world_id := str(inspection.get("world_id", ShellSchema.WORLD_ID))
	var world_revision := str(inspection.get("world_revision", ShellSchema.WORLD_REVISION))
	var evidence := {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"runId": run_id,
		"adapter": "godot",
		"sessionId": session_id,
		"worldId": world_id,
		"worldRevision": world_revision,
		"createdAtMs": timestamp_ms,
		"events": [
			{
				"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
				"eventId": "event-domain-shell-%s" % timestamp_ms,
				"eventName": "shell_domain_surfaces_loaded",
				"eventFamily": "domain",
				"adapter": "godot",
				"sessionId": session_id,
				"worldId": world_id,
				"worldRevision": world_revision,
				"timestampMs": timestamp_ms,
				"socialLoopStage": "intake",
				"summary": "Godot shell loaded canonical text surfaces and Station intake metadata."
			},
			{
				"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
				"eventId": "event-export-shell-%s" % timestamp_ms,
				"eventName": "evidence_pack_created",
				"eventFamily": "evidence_export",
				"adapter": "godot",
				"sessionId": session_id,
				"worldId": world_id,
				"worldRevision": world_revision,
				"timestampMs": timestamp_ms,
				"artifactPath": "data/evidence/godot/shell/dre_171_shell_evidence.json",
				"summary": "Godot shell Evidence Pack exported."
			}
		],
		"summaries": {
			"runSignature": "%s:%s:%s" % [run_id, world_id, world_revision],
			"actorSignatures": _actor_signatures(inspection),
			"fallbackCounters": {"total": 0},
			"commandOutcomeCounts": {"validated": 0, "rejected": 0},
			"domainTriggerCounts": {"shell_domain_surfaces_loaded": 1},
			"verdictEndStateTrace": "Trigger -> ShellInspector -> TextSurface registry -> intake -> blocked until playable domain controller",
			"blockedChecks": [] if inspection["ok"] else inspection.get("failures", [])
		},
		"issueId": ShellSchema.ISSUE_ID,
		"runtimePath": inspection.get("runtime_path", "Godot 4.x shell"),
		"mainScene": MAIN_SCENE,
		"verdict": "pass" if inspection["ok"] else "fail",
		"inspection": inspection
		}
	
	var output_path := ProjectSettings.globalize_path(EVIDENCE_OUTPUT_PATH)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		_fail(["Unable to write Evidence output: %s" % output_path])
		return
	file.store_string(JSON.stringify(evidence, "\t"))
	file.close()

	print(JSON.stringify(evidence, "\t"))
	quit(0 if inspection["ok"] else 1)

func _actor_signatures(inspection: Dictionary) -> Dictionary:
	var signatures := {}
	for npc_id in inspection.get("npc_ids", []):
		signatures[str(npc_id)] = "%s:%s" % [inspection.get("world_id", ShellSchema.WORLD_ID), str(npc_id)]
	return signatures

func _fail(failures: Array[String]) -> void:
	var timestamp_ms := int(Time.get_unix_time_from_system() * 1000.0)
	var evidence := {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"runId": "dre-171-shell-run",
		"adapter": "godot",
		"sessionId": "dre-171-shell-session",
		"worldId": ShellSchema.WORLD_ID,
		"worldRevision": ShellSchema.WORLD_REVISION,
		"createdAtMs": timestamp_ms,
		"events": [],
		"summaries": {
			"runSignature": "failed-before-scene-load",
			"actorSignatures": {},
			"fallbackCounters": {"total": 0},
			"commandOutcomeCounts": {"validated": 0, "rejected": 0},
			"domainTriggerCounts": {},
			"verdictEndStateTrace": "Evidence export failed before scene load.",
			"blockedChecks": failures
		},
		"issueId": ShellSchema.ISSUE_ID,
		"verdict": "fail",
		"inspection": {
			"ok": false,
			"failures": failures
		}
	}
	printerr(JSON.stringify(evidence, "\t"))
	quit(1)
