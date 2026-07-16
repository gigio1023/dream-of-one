extends Node
## RuntimeBridge owns a small pool of Godot HTTPRequest nodes for localhost
## JSON calls to the TypeScript sidecar. Calls are asynchronous by design: an
## HTTPRequest completes from the SceneTree and must never be wrapped in a
## blocking poll loop on the render thread.

signal request_released

const DEFAULT_TIMEOUT_SECONDS := 8.0
# One foreground request stays available while the client permits one opening
# preload and one ambient decision to wait on provider work.
const DEFAULT_POOL_SIZE := 3

var _base_url := "http://127.0.0.1:8787"
var _configuration_error := ""
var _available: Array[HTTPRequest] = []

func _ready() -> void:
	_ensure_pool()

## Returns false when the URL is not an HTTP(S) loopback URL. The game runtime
## is intentionally localhost-only; remote provider access belongs behind the
## sidecar's provider ports, never in Godot.
func configure(base_url: String) -> bool:
	_configuration_error = ""
	var candidate := base_url.strip_edges().trim_suffix("/")
	if candidate.is_empty():
		_configuration_error = "empty_base_url"
		return false
	if not candidate.begins_with("http://") and not candidate.begins_with("https://"):
		_configuration_error = "unsupported_scheme"
		return false
	var authority := candidate.get_slice("://", 1).get_slice("/", 0)
	var host := authority
	if authority.begins_with("["):
		var close := authority.find("]")
		if close < 0:
			_configuration_error = "invalid_host"
			return false
		host = authority.substr(1, close - 1)
	elif authority.count(":") == 1:
		host = authority.get_slice(":", 0)
	if host not in ["127.0.0.1", "localhost", "::1"]:
		_configuration_error = "non_loopback_host"
		return false
	_base_url = candidate
	return true

func post_json(path: String, body: Dictionary, timeout_seconds := DEFAULT_TIMEOUT_SECONDS) -> Dictionary:
	return await _request(HTTPClient.METHOD_POST, path, JSON.stringify(body), timeout_seconds)

func get_json(path: String, timeout_seconds := DEFAULT_TIMEOUT_SECONDS) -> Dictionary:
	return await _request(HTTPClient.METHOD_GET, path, "", timeout_seconds)

func _request(method: int, path: String, body: String, timeout_seconds: float) -> Dictionary:
	if not _configuration_error.is_empty():
		return _fail("invalid_base_url", _configuration_error)
	_ensure_pool()
	var request := await _acquire_request()
	request.timeout = timeout_seconds
	var headers := PackedStringArray(["Accept: application/json"])
	if method != HTTPClient.METHOD_GET:
		headers.append("Content-Type: application/json")
	var error := request.request(_join_url(path), headers, method, body)
	if error != OK:
		_release_request(request)
		return _fail("request_start_failed", error)

	var completed: Array = await request.request_completed
	_release_request(request)
	var result := int(completed[0])
	var status_code := int(completed[1])
	var response_headers: PackedStringArray = completed[2]
	var response_body: PackedByteArray = completed[3]
	var text := response_body.get_string_from_utf8()
	var parsed = JSON.parse_string(text) if not text.is_empty() else {}
	var json_body: Dictionary = parsed if parsed is Dictionary else {}
	var success := (
		result == HTTPRequest.RESULT_SUCCESS
		and status_code >= 200
		and status_code < 300
		and parsed is Dictionary
	)
	return {
		"ok": success,
		"status": status_code,
		"json": json_body,
		"result": result,
		"headers": response_headers,
		"reason": "" if success else _failure_reason(result, status_code, parsed),
	}

func _ensure_pool() -> void:
	if not _available.is_empty() or get_child_count() > 0:
		return
	for _index in range(DEFAULT_POOL_SIZE):
		var request := HTTPRequest.new()
		request.use_threads = true
		add_child(request)
		_available.append(request)

func _acquire_request() -> HTTPRequest:
	while _available.is_empty():
		await request_released
	return _available.pop_back()

func _release_request(request: HTTPRequest) -> void:
	_available.append(request)
	request_released.emit()

func _join_url(path: String) -> String:
	if path.begins_with("/"):
		return _base_url + path
	return "%s/%s" % [_base_url, path]

func _failure_reason(result: int, status_code: int, parsed: Variant) -> String:
	if result != HTTPRequest.RESULT_SUCCESS:
		return "request_result_%d" % result
	if status_code < 200 or status_code >= 300:
		return "http_%d" % status_code
	if not parsed is Dictionary:
		return "invalid_json_response"
	return "unknown_transport_error"

func _fail(reason: String, detail: Variant) -> Dictionary:
	return {
		"ok": false,
		"status": 0,
		"json": {},
		"result": HTTPRequest.RESULT_CANT_CONNECT,
		"headers": PackedStringArray(),
		"reason": reason,
		"detail": detail,
	}
