// Generated draft from src/durable_file.rs; sha256=970eae37d4f282547bdcc178ce08eb119ce87ed0e593a6bad6aa5444433de6f0
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../runtime/time-runtime.mjs";

function ROLLBACK_SUFFIX() {
  return ".router-rollback";
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

function COMMIT_SUFFIX() {
  return ".router-commit";
}

function LOCK_POLL_INTERVAL() {
  return ml_host_std_time_duration_from_millis(20n);
}

export const translated = { ["ROLLBACK_SUFFIX"]: ROLLBACK_SUFFIX(), ["COMMIT_SUFFIX"]: COMMIT_SUFFIX(), ["LOCK_POLL_INTERVAL"]: LOCK_POLL_INTERVAL() };
export const provenance = {"sourcePath":"src/durable_file.rs","sourceSha256":"970eae37d4f282547bdcc178ce08eb119ce87ed0e593a6bad6aa5444433de6f0","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":30,"runtimeParity":false};
