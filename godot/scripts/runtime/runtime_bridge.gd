extends RefCounted
## RuntimeBridge — synchronous localhost JSON transport to the TS sidecar.
##
## Deliberately synchronous (HTTPClient poll loop) so the Session facade can
## stay non-coroutine for both backends; the sidecar is localhost-only and only
## used in the flag-gated http mode, so a bounded blocking poll is acceptable
## for M1. See docs/tech/architecture.md (client <-> runtime transport).

const DEFAULT_TIMEOUT_MS := 8000

var _base := "http://127.0.0.1:8787"

func configure(base_url: String) -> void:
	_base = base_url.trim_suffix("/")

func post_json(path: String, body: Dictionary, timeout_ms := DEFAULT_TIMEOUT_MS) -> Dictionary:
	return _request(HTTPClient.METHOD_POST, path, JSON.stringify(body), timeout_ms)

func get_json(path: String, timeout_ms := DEFAULT_TIMEOUT_MS) -> Dictionary:
	return _request(HTTPClient.METHOD_GET, path, "", timeout_ms)

func _request(method: int, path: String, body: String, timeout_ms: int) -> Dictionary:
	var url := _base + path
	var scheme_split := _base.trim_prefix("http://").trim_prefix("https://")
	var host_port := scheme_split.get_slice("/", 0)
	var host := host_port.get_slice(":", 0)
	var port := 80
	if host_port.find(":") >= 0:
		port = int(host_port.get_slice(":", 1))
	var use_tls := _base.begins_with("https://")

	var client := HTTPClient.new()
	var err := client.connect_to_host(host, port, TLSOptions.client() if use_tls else null)
	if err != OK:
		return _fail("connect_failed", err)
	var deadline := Time.get_ticks_msec() + timeout_ms
	while client.get_status() == HTTPClient.STATUS_CONNECTING or client.get_status() == HTTPClient.STATUS_RESOLVING:
		client.poll()
		if Time.get_ticks_msec() > deadline:
			return _fail("connect_timeout", 0)
		OS.delay_msec(4)
	if client.get_status() != HTTPClient.STATUS_CONNECTED:
		return _fail("not_connected", client.get_status())

	var request_path := path
	var headers := PackedStringArray(["Accept: application/json", "Content-Type: application/json"])
	err = client.request(method, request_path, headers, body)
	if err != OK:
		return _fail("request_failed", err)
	while client.get_status() == HTTPClient.STATUS_REQUESTING:
		client.poll()
		if Time.get_ticks_msec() > deadline:
			return _fail("request_timeout", 0)
		OS.delay_msec(4)

	if not (client.get_status() == HTTPClient.STATUS_BODY or client.get_status() == HTTPClient.STATUS_CONNECTED):
		return _fail("no_response", client.get_status())
	var status_code := client.get_response_code()
	var buffer := PackedByteArray()
	while client.get_status() == HTTPClient.STATUS_BODY:
		client.poll()
		var chunk := client.read_response_body_chunk()
		if chunk.size() == 0:
			if Time.get_ticks_msec() > deadline:
				break
			OS.delay_msec(2)
		else:
			buffer.append_array(chunk)
	client.close()
	var text := buffer.get_string_from_utf8()
	var parsed = JSON.parse_string(text)
	return {
		"ok": status_code >= 200 and status_code < 300 and parsed is Dictionary,
		"status": status_code,
		"json": parsed if parsed is Dictionary else {},
		"url": url,
	}

func _fail(reason: String, detail: int) -> Dictionary:
	return {"ok": false, "status": 0, "json": {}, "reason": reason, "detail": detail}
