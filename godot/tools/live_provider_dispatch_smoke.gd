extends SceneTree

const BackendBridge := preload("res://scripts/runtime/backend_bridge.gd")
const ShellSchema := preload("res://scripts/data/shell_schema.gd")
const OUTPUT_PATH := "res://../data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json"
const ARTIFACT_PATH := "data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json"
const OUTPUT_ENV := "DREAM_OF_ONE_LIVE_PROVIDER_DISPATCH_OUTPUT"

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var failures: Array[String] = []
	var context := _mock_context()
	var before_fingerprint := JSON.stringify(context)
	var ready_endpoint := OS.get_environment("DREAM_LIVE_BACKEND_READY_URL")
	if ready_endpoint.is_empty():
		ready_endpoint = BackendBridge.DEFAULT_READINESS_URL
	var decision_endpoint := OS.get_environment("DREAM_LIVE_BACKEND_DECISION_URL")
	if decision_endpoint.is_empty():
		decision_endpoint = BackendBridge.DEFAULT_DECISION_URL

	var readiness := await BackendBridge.probe_live_readiness(
		self,
		context,
		ready_endpoint,
		BackendBridge.DEFAULT_DECISION_TIMEOUT_MS
	)
	_require(readiness["ok"], failures, "Live backend readiness must pass before spending a provider decision request.")
	_require(readiness.get("providerReady", false), failures, "Live backend provider must be ready.")
	_require(not bool(readiness["state"]["aiOwnsState"]), failures, "AI must not own Godot state in readiness.")
	_require(not bool(readiness["state"]["bridgeOwnsState"]), failures, "Bridge must not own Godot state in readiness.")

	var decision_report := {}
	if failures.is_empty():
		decision_report = await BackendBridge.probe_live_decision(
			self,
			_live_packet(),
			decision_endpoint,
			BackendBridge.DEFAULT_DECISION_TIMEOUT_MS
		)
		_validate_decision_report(decision_report, failures)

	var after_fingerprint := JSON.stringify(context)
	_require(before_fingerprint == after_fingerprint, failures, "Live provider dispatch smoke mutated runtime context.")

	var decision: Dictionary = decision_report.get("decision", {})
	var meta: Dictionary = decision.get("meta", {})
	var intent: Dictionary = decision.get("intent", {})
	var provider_usage: Dictionary = meta.get("providerUsage", {})
	var pack := {
		"ok": failures.is_empty(),
		"runId": "dre-live-provider-dispatch-smoke",
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"adapter": "godot",
		"checks": {
			"readiness": _summarize_readiness(readiness),
			"decision": _summarize_decision(decision_report)
		},
		"proofs": {
			"decisionRequested": not decision_report.is_empty(),
			"commandExecuted": false,
			"contextMutated": before_fingerprint != after_fingerprint,
			"providerMode": "openai-codex",
			"selectedModel": str(provider_usage.get("model", "")),
			"usedFallback": bool(meta.get("usedFallback", true)),
			"transport": str(meta.get("transport", "")),
			"utterance": str(intent.get("utterance", "")),
			"estimatedCostUsd": float(provider_usage.get("estimatedCostUsd", 0.0)),
			"actualInputTokens": int(provider_usage.get("actualInputTokens", 0)),
			"actualOutputTokens": int(provider_usage.get("actualOutputTokens", 0)),
			"actualTotalTokens": int(provider_usage.get("actualTotalTokens", 0)),
			"chatGptProQuotaRemaining": "not_exposed_by_codex_response",
			"productProviderStateChanged": false
		},
		"artifactPath": ARTIFACT_PATH,
		"failures": failures
	}

	var output_path := _evidence_output_path()
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		failures.append("Unable to write live provider dispatch evidence: %s" % error_string(FileAccess.get_open_error()))
		pack["ok"] = false
		pack["failures"] = failures
	else:
		file.store_string(JSON.stringify(pack, "\t"))
		file.close()

	if failures.is_empty():
		print(JSON.stringify(pack, "\t"))
		quit(0)
	else:
		printerr(JSON.stringify(pack, "\t"))
		quit(1)

func _live_packet() -> Dictionary:
	var session_id := "godot-live-provider-dispatch-smoke-%d" % Time.get_ticks_msec()
	return {
		"sessionId": session_id,
		"npcId": "store-clerk-godot-live-dispatch",
		"landmarkId": "Store",
		"nearbyActors": ["player", "waiting-customer"],
		"recentEvents": [
			"player_repeated_wrong_receipt_request",
			"store_receipt_tray_visible",
			"waiting_customer_observed_queue_delay"
		],
		"organizationContext": {
			"organization": "Store",
			"role": "Clerk",
			"duty": "keep receipt records consistent while serving the queue",
			"availableAffordances": ["mark_receipt", "answer_locally", "place_note"]
		},
		"playerSignals": {
			"suspicion": 0.42,
			"exposure": 0.2,
			"lastSpeechAct": "SA_INQUIRE",
			"deterministicOutcome": "wording_only_live_probe"
		}
	}

func _mock_context() -> Dictionary:
	return {
		"sessionId": "dre-live-provider-dispatch-smoke-session",
		"worldId": ShellSchema.WORLD_ID,
		"worldRevision": ShellSchema.WORLD_REVISION,
		"actorIds": ["NPC_Store_Clerk", "player"],
		"landmarkIds": ShellSchema.REQUIRED_LANDMARKS,
		"zoneIds": ["StoreCounterZone"],
		"textSurfaceIds": ShellSchema.REQUIRED_TEXT_SURFACES,
		"completedCommandIds": [],
		"inFlightActorIds": []
	}

func _validate_decision_report(report: Dictionary, failures: Array[String]) -> void:
	_require(report.get("ok", false), failures, "Live provider decision must return ok=true.")
	_require(int(report.get("httpStatus", 0)) == 200, failures, "Decision endpoint must return HTTP 200.")
	_require(not bool(report["state"]["aiOwnsState"]), failures, "AI must not own Godot state in decision.")
	_require(not bool(report["state"]["bridgeOwnsState"]), failures, "Bridge must not own Godot state in decision.")
	var decision: Dictionary = report.get("decision", {})
	var intent: Dictionary = decision.get("intent", {})
	var meta: Dictionary = decision.get("meta", {})
	var provider_usage: Dictionary = meta.get("providerUsage", {})
	_require(not bool(meta.get("usedFallback", true)), failures, "Live provider decision must not use fallback.")
	_require(str(meta.get("transport", "")) == "codex", failures, "Live provider decision must use codex transport.")
	_require(str(provider_usage.get("model", "")) == "gpt-5.4-mini", failures, "Live provider decision must use gpt-5.4-mini.")
	_require(float(provider_usage.get("estimatedCostUsd", 1.0)) <= 0.005, failures, "Live provider decision must stay under the per-request estimated cap.")
	_require(int(provider_usage.get("actualTotalTokens", 0)) > 0, failures, "Live provider decision must report actual token usage.")
	_require(str(intent.get("npcId", "")) == "store-clerk-godot-live-dispatch", failures, "Live provider decision must target the requested NPC.")
	_require(str(intent.get("utterance", "")).length() > 0, failures, "Live provider decision must include bounded wording.")
	_require(Array(intent.get("reasonCodes", [])).has("openai_text_proposal"), failures, "Live provider decision must mark wording-only proposal reason.")

func _summarize_readiness(readiness: Dictionary) -> Dictionary:
	return {
		"ok": readiness.get("ok", false),
		"bridgeStatus": readiness.get("bridgeStatus", "unknown"),
		"providerReady": readiness.get("providerReady", false),
		"storageReady": readiness.get("storageReady", false),
		"endpoint": readiness.get("endpoint", ""),
		"reasons": readiness.get("reasons", []),
		"provider": readiness.get("readiness", {}).get("checks", {}).get("provider", {})
	}

func _summarize_decision(report: Dictionary) -> Dictionary:
	var decision: Dictionary = report.get("decision", {})
	var intent: Dictionary = decision.get("intent", {})
	var meta: Dictionary = decision.get("meta", {})
	return {
		"ok": report.get("ok", false),
		"httpStatus": report.get("httpStatus", 0),
		"reason": report.get("reason", ""),
		"endpoint": report.get("endpoint", ""),
		"npcId": intent.get("npcId", ""),
		"actionType": intent.get("actionType", ""),
		"utterance": intent.get("utterance", ""),
		"usedFallback": meta.get("usedFallback", true),
		"transport": meta.get("transport", ""),
		"threadId": meta.get("threadId", ""),
		"providerUsage": meta.get("providerUsage", {})
	}

func _require(condition: bool, failures: Array[String], message: String) -> void:
	if not condition:
		failures.append(message)

func _evidence_output_path() -> String:
	var override_path := OS.get_environment(OUTPUT_ENV)
	if not override_path.is_empty():
		if override_path.begins_with("res://") or override_path.begins_with("user://"):
			return ProjectSettings.globalize_path(override_path)
		return ProjectSettings.globalize_path(override_path)
	return ProjectSettings.globalize_path(OUTPUT_PATH)
