// Generated draft from src/codex_loopback_bridge.rs; sha256=6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs, std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../runtime/time-runtime.mjs";

function rp_636f6465785f6c6f6f706261636b5f6272696467652e434f4e4e4543545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
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

export const translated = { ["CONNECT_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e434f4e4e4543545f54494d454f5554(), ["START_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544152545f54494d454f5554(), ["STOP_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544f505f54494d454f5554(), ["POLL_INTERVAL"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e504f4c4c5f494e54455256414c() };
export const provenance = {"sourcePath":"src/codex_loopback_bridge.rs","sourceSha256":"6e93120f6cebbce644471086d38f2b1443eb2e0d8e7d25fdae23f7e9123c4b9e","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":79,"preserved":84,"runtimeParity":false};
