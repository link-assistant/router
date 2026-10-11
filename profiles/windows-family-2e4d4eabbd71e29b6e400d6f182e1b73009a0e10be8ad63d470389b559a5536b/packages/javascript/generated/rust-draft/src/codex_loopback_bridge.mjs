// Generated draft from src/codex_loopback_bridge.rs; sha256=6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs, std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../runtime/time-runtime.mjs";

import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4241434b454e445f50415448() {
  return "/api/services/codex/backend-api";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4d41585f485454505f424f44595f4259544553() {
  return ml_fixed((ml_fixed((8n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4d41585f574542534f434b45545f4d4553534147455f4259544553() {
  return ml_fixed((ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e434f4e4e4543545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e53544154455f56455253494f4e() {
  return 1n;
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4845414c54485f484541444552() {
  return "x-link-assistant-router-codex-bridge";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4d41524b45525f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f555053545245414d5f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_UPSTREAM";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f53544154455f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_STATE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4e4f4e43455f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_NONCE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4c495354454e5f454e56() {
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

function rp_636f6465785f6c6f6f706261636b5f6272696467652e57494e444f57535f52554e54494d455f454e56() {
  return ml_copy_fixed_array(["SystemRoot", "WINDIR", "TEMP", "TMP"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":4}});
}

export const translated = { ["BACKEND_PATH"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4241434b454e445f50415448(), ["MAX_HTTP_BODY_BYTES"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4d41585f485454505f424f44595f4259544553(), ["MAX_WEBSOCKET_MESSAGE_BYTES"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4d41585f574542534f434b45545f4d4553534147455f4259544553(), ["CONNECT_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e434f4e4e4543545f54494d454f5554(), ["STATE_VERSION"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544154455f56455253494f4e(), ["HEALTH_HEADER"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4845414c54485f484541444552(), ["DAEMON_MARKER_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4d41524b45525f454e56(), ["DAEMON_UPSTREAM_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f555053545245414d5f454e56(), ["DAEMON_STATE_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f53544154455f454e56(), ["DAEMON_NONCE_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4e4f4e43455f454e56(), ["DAEMON_LISTEN_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4c495354454e5f454e56(), ["START_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544152545f54494d454f5554(), ["STOP_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544f505f54494d454f5554(), ["POLL_INTERVAL"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e504f4c4c5f494e54455256414c(), ["WINDOWS_RUNTIME_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e57494e444f57535f52554e54494d455f454e56() };
export const provenance = {"sourcePath":"src/codex_loopback_bridge.rs","sourceSha256":"6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e","executable":15,"executableFunctions":0,"executableConstants":15,"executableTypes":0,"executableConstructors":0,"carried":68,"preserved":84,"runtimeParity":false};
