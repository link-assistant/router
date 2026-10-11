// Generated draft from src/codex_loopback_bridge.rs; sha256=6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs, std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../runtime/time-runtime.mjs";

function BACKEND_PATH() {
  return "/api/services/codex/backend-api";
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
};

const serde_json = {
  error: {

  },
};

function MAX_HTTP_BODY_BYTES() {
  return ml_fixed((ml_fixed((8n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_WEBSOCKET_MESSAGE_BYTES() {
  return ml_fixed((ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function CONNECT_TIMEOUT() {
  return ml_host_std_time_duration_from_secs(15n);
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

function rp_636f6465785f6c6f6f706261636b5f6272696467652e53544152545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(5n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e53544f505f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(3n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e504f4c4c5f494e54455256414c() {
  return ml_host_std_time_duration_from_millis(25n);
}

function health_path(nonce) {
  if (!(typeof nonce === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(nonce))) throw new TypeError('argument outside supported Rust value domain');
  return ("/__link_assistant_router/codex_bridge/" + nonce);
}

export const translated = { ["BACKEND_PATH"]: BACKEND_PATH(), ["MAX_HTTP_BODY_BYTES"]: MAX_HTTP_BODY_BYTES(), ["MAX_WEBSOCKET_MESSAGE_BYTES"]: MAX_WEBSOCKET_MESSAGE_BYTES(), ["CONNECT_TIMEOUT"]: CONNECT_TIMEOUT(), ["STATE_VERSION"]: STATE_VERSION(), ["HEALTH_HEADER"]: HEALTH_HEADER(), ["DAEMON_MARKER_ENV"]: DAEMON_MARKER_ENV(), ["DAEMON_UPSTREAM_ENV"]: DAEMON_UPSTREAM_ENV(), ["DAEMON_STATE_ENV"]: DAEMON_STATE_ENV(), ["DAEMON_NONCE_ENV"]: DAEMON_NONCE_ENV(), ["DAEMON_LISTEN_ENV"]: DAEMON_LISTEN_ENV(), ["START_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544152545f54494d454f5554(), ["STOP_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544f505f54494d454f5554(), ["POLL_INTERVAL"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e504f4c4c5f494e54455256414c(), ["health_path"]: health_path };
export const provenance = {"sourcePath":"src/codex_loopback_bridge.rs","sourceSha256":"6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e","executable":15,"executableFunctions":1,"executableConstants":14,"executableTypes":0,"executableConstructors":0,"carried":68,"preserved":84,"runtimeParity":false};
