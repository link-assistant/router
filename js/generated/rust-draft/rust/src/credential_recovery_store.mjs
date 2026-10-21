// Generated draft from rust/src/credential_recovery_store.rs; sha256=c62c45db5636c5248918311be247fcca3c47620d57282acd818cdbac0d9aa1c4
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f56455253494f4e() {
  return 1n;
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f4449524543544f5259() {
  return "refresh-recovery";
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e5052494d4152595f4143434f554e54() {
  return "primary";
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e43524544454e5449414c5f4c4f434b5f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(5n);
}

export const translated = { ["RECOVERY_VERSION"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f56455253494f4e(), ["RECOVERY_DIRECTORY"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f4449524543544f5259(), ["PRIMARY_ACCOUNT"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e5052494d4152595f4143434f554e54(), ["CREDENTIAL_LOCK_TIMEOUT"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e43524544454e5449414c5f4c4f434b5f54494d454f5554() };
export const provenance = {"sourcePath":"rust/src/credential_recovery_store.rs","sourceSha256":"c62c45db5636c5248918311be247fcca3c47620d57282acd818cdbac0d9aa1c4","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":13,"preserved":18,"runtimeParity":false};
