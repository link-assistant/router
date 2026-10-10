// Generated draft from src/codex_loopback_bridge.rs; sha256=6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: any, min: any, max: any, message: any) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function BACKEND_PATH() {
  return "/api/services/codex/backend-api";
}

function MAX_HTTP_BODY_BYTES() {
  return ml_fixed((ml_fixed((8n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_WEBSOCKET_MESSAGE_BYTES() {
  return ml_fixed((ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function STATE_VERSION() {
  return 1n;
}

function HEALTH_HEADER() {
  return "x-link-assistant-router-codex-bridge";
}

function DAEMON_MARKER_ENV() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE";
}

function DAEMON_UPSTREAM_ENV() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_UPSTREAM";
}

function DAEMON_STATE_ENV() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_STATE";
}

function DAEMON_NONCE_ENV() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_NONCE";
}

function DAEMON_LISTEN_ENV() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_LISTEN";
}

function health_path(nonce: string) {
  return ("/__link_assistant_router/codex_bridge/" + nonce);
}

export const translated: { "BACKEND_PATH": string; "MAX_HTTP_BODY_BYTES": bigint; "MAX_WEBSOCKET_MESSAGE_BYTES": bigint; "STATE_VERSION": bigint; "HEALTH_HEADER": string; "DAEMON_MARKER_ENV": string; "DAEMON_UPSTREAM_ENV": string; "DAEMON_STATE_ENV": string; "DAEMON_NONCE_ENV": string; "DAEMON_LISTEN_ENV": string; "health_path": (nonce: string) => string } = { "BACKEND_PATH": BACKEND_PATH(), "MAX_HTTP_BODY_BYTES": MAX_HTTP_BODY_BYTES(), "MAX_WEBSOCKET_MESSAGE_BYTES": MAX_WEBSOCKET_MESSAGE_BYTES(), "STATE_VERSION": STATE_VERSION(), "HEALTH_HEADER": HEALTH_HEADER(), "DAEMON_MARKER_ENV": DAEMON_MARKER_ENV(), "DAEMON_UPSTREAM_ENV": DAEMON_UPSTREAM_ENV(), "DAEMON_STATE_ENV": DAEMON_STATE_ENV(), "DAEMON_NONCE_ENV": DAEMON_NONCE_ENV(), "DAEMON_LISTEN_ENV": DAEMON_LISTEN_ENV(), health_path };
export const provenance = {"sourcePath":"src/codex_loopback_bridge.rs","sourceSha256":"6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e","executable":11,"carried":72,"preserved":84,"runtimeParity":false};
