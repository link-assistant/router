type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from src/codex_loopback_bridge.rs; sha256=6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs, std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../runtime/time-runtime.mjs";

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4241434b454e445f50415448(): string {
  return "/api/services/codex/backend-api";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e434f4e4e4543545f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4845414c54485f484541444552(): string {
  return "x-link-assistant-router-codex-bridge";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4d41524b45525f454e56(): string {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f555053545245414d5f454e56(): string {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_UPSTREAM";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f53544154455f454e56(): string {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_STATE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4e4f4e43455f454e56(): string {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_NONCE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4c495354454e5f454e56(): string {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_LISTEN";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e53544152545f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(5n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e53544f505f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(3n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e504f4c4c5f494e54455256414c(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_millis(25n);
}

export const translated: { "BACKEND_PATH": string; "CONNECT_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "HEALTH_HEADER": string; "DAEMON_MARKER_ENV": string; "DAEMON_UPSTREAM_ENV": string; "DAEMON_STATE_ENV": string; "DAEMON_NONCE_ENV": string; "DAEMON_LISTEN_ENV": string; "START_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "STOP_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "POLL_INTERVAL": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> } = { ["BACKEND_PATH"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4241434b454e445f50415448(), ["CONNECT_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e434f4e4e4543545f54494d454f5554(), ["HEALTH_HEADER"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4845414c54485f484541444552(), ["DAEMON_MARKER_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4d41524b45525f454e56(), ["DAEMON_UPSTREAM_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f555053545245414d5f454e56(), ["DAEMON_STATE_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f53544154455f454e56(), ["DAEMON_NONCE_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4e4f4e43455f454e56(), ["DAEMON_LISTEN_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4c495354454e5f454e56(), ["START_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544152545f54494d454f5554(), ["STOP_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544f505f54494d454f5554(), ["POLL_INTERVAL"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e504f4c4c5f494e54455256414c() };
export const provenance = {"sourcePath":"src/codex_loopback_bridge.rs","sourceSha256":"6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e","executable":11,"executableFunctions":0,"executableConstants":11,"executableTypes":0,"executableConstructors":0,"carried":72,"preserved":84,"runtimeParity":false};
