// Generated draft from src/credential_recovery_store.rs; sha256=91af0053ff35f899efd181962f0492665e10bfab06b59e2c30b261dfabbc8f5e
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function RECOVERY_VERSION() {
  return 1n;
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

function RECOVERY_DIRECTORY() {
  return "refresh-recovery";
}

function PRIMARY_ACCOUNT() {
  return "primary";
}

function CREDENTIAL_LOCK_TIMEOUT() {
  return ml_host_std_time_duration_from_secs(5n);
}

export const translated = { ["RECOVERY_VERSION"]: RECOVERY_VERSION(), ["RECOVERY_DIRECTORY"]: RECOVERY_DIRECTORY(), ["PRIMARY_ACCOUNT"]: PRIMARY_ACCOUNT(), ["CREDENTIAL_LOCK_TIMEOUT"]: CREDENTIAL_LOCK_TIMEOUT() };
export const provenance = {"sourcePath":"src/credential_recovery_store.rs","sourceSha256":"91af0053ff35f899efd181962f0492665e10bfab06b59e2c30b261dfabbc8f5e","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":13,"preserved":18,"runtimeParity":false};
