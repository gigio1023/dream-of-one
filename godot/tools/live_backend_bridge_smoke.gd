extends SceneTree

const BackendBridge := preload("res://scripts/runtime/backend_bridge.gd")
const GodotRuntimeSlice := preload("res://scripts/runtime/runtime_slice.gd")
const ShellSchema := preload("res://scripts/data/shell_schema.gd")

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var failures: Array[String] = []
	var context := _mock_context()
	var before_fingerprint := JSON.stringify(context)

	var ready_preflight := BackendBridge.preflight_from_report(context, BackendBridge.ready_fixture(), "mock-ready")
	_require(ready_preflight["ok"], failures, "Expected mock-ready preflight to be ready.")
	_require(ready_preflight["bridgeStatus"] == "ready", failures, "Expected mock-ready bridgeStatus=ready.")
	_require(ready_preflight.get("fallbackCommand", {}).is_empty(), failures, "Ready preflight must not create fallback command.")
	_require(not bool(ready_preflight["state"]["aiOwnsState"]), failures, "AI must not own Godot state in ready preflight.")
	_require(not bool(ready_preflight["state"]["bridgeOwnsState"]), failures, "Bridge must not own Godot state in ready preflight.")

	var missing_key_preflight := BackendBridge.preflight_from_report(
		context,
		BackendBridge.not_ready_fixture("openai_api_key_missing"),
		"mock-missing-key"
	)
	_require(not missing_key_preflight["ok"], failures, "Expected missing-key preflight to enter fallback.")
	_require(missing_key_preflight["bridgeStatus"] == "fallback", failures, "Expected missing-key bridgeStatus=fallback.")
	_require(
		missing_key_preflight["reasons"].has("openai_api_key_missing"),
		failures,
		"Expected openai_api_key_missing reason."
	)
	_validate_fallback_command(missing_key_preflight.get("fallbackCommand", {}), context, failures, "missing-key")

	var endpoint := OS.get_environment("DREAM_LIVE_BACKEND_READY_URL")
	if endpoint.is_empty():
		endpoint = BackendBridge.DEFAULT_READINESS_URL
	var live_preflight := await BackendBridge.probe_live_readiness(self, context, endpoint, BackendBridge.DEFAULT_TIMEOUT_MS)
	_require(
		live_preflight["ok"] or live_preflight["bridgeStatus"] == "fallback",
		failures,
		"Live preflight must return ready or controlled fallback."
	)
	_require(not bool(live_preflight["state"]["aiOwnsState"]), failures, "AI must not own Godot state in live preflight.")
	_require(not bool(live_preflight["state"]["bridgeOwnsState"]), failures, "Bridge must not own Godot state in live preflight.")
	if not live_preflight["ok"]:
		_validate_fallback_command(live_preflight.get("fallbackCommand", {}), context, failures, "live")

	var after_fingerprint := JSON.stringify(context)
	_require(before_fingerprint == after_fingerprint, failures, "Bridge preflight mutated runtime context.")

	var pack := {
		"ok": failures.is_empty(),
		"runId": "dre-live-backend-bridge-smoke",
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"adapter": "godot",
		"checks": {
			"mockReady": _summarize(ready_preflight),
			"mockMissingKey": _summarize(missing_key_preflight),
			"liveReadiness": _summarize(live_preflight)
		},
		"proofs": {
			"apiKeyRequiredBySmoke": false,
			"decisionRequested": false,
			"commandExecuted": false,
			"contextMutated": before_fingerprint != after_fingerprint,
			"fallbackValidatedByRuntimeSlice": missing_key_preflight.get("fallbackCommand", {}).has("commandId")
		},
		"failures": failures
	}

	if failures.is_empty():
		print(JSON.stringify(pack, "\t"))
		quit(0)
	else:
		printerr(JSON.stringify(pack, "\t"))
		quit(1)

func _mock_context() -> Dictionary:
	return {
		"sessionId": "dre-live-bridge-smoke-session",
		"worldId": ShellSchema.WORLD_ID,
		"worldRevision": ShellSchema.WORLD_REVISION,
		"actorIds": ["NPC_Station_Officer", "player"],
		"landmarkIds": ShellSchema.REQUIRED_LANDMARKS,
		"zoneIds": ["StationIntakeZone"],
		"textSurfaceIds": ShellSchema.REQUIRED_TEXT_SURFACES,
		"completedCommandIds": [],
		"inFlightActorIds": []
	}

func _validate_fallback_command(command: Dictionary, context: Dictionary, failures: Array[String], label: String) -> void:
	if command.is_empty():
		failures.append("%s fallback command is empty." % label)
		return
	_require(command.get("actionType", "") == "Idle", failures, "%s fallback must be Idle." % label)
	_require(command.get("source", "") == "fallback", failures, "%s fallback source must be fallback." % label)
	_require(int(command.get("issuedAtMs", -1)) == 0, failures, "%s fallback issuedAtMs must be deterministic." % label)

	var validation := GodotRuntimeSlice.validate_command(command, context)
	if not validation["ok"]:
		failures.append("%s fallback failed runtime slice validation: %s" % [label, JSON.stringify(validation)])

func _summarize(preflight: Dictionary) -> Dictionary:
	return {
		"ok": preflight.get("ok", false),
		"bridgeStatus": preflight.get("bridgeStatus", "unknown"),
		"mode": preflight.get("mode", "unknown"),
		"endpoint": preflight.get("endpoint", ""),
		"reasons": preflight.get("reasons", []),
		"providerReady": preflight.get("providerReady", false),
		"storageReady": preflight.get("storageReady", false),
		"fallbackActionType": preflight.get("fallbackCommand", {}).get("actionType", ""),
		"state": preflight.get("state", {})
	}

func _require(condition: bool, failures: Array[String], message: String) -> void:
	if not condition:
		failures.append(message)
