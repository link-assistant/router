// Generated draft from src/client_lifecycle/active.rs; sha256=6429b7a699dc500b96f0b9b84fbf9364db604158d7ee4e41cdd133a03e9fbf07
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_millis as ml_host_std_time_duration_from_millis } from "../../runtime/time-runtime.mjs";

function PROFILE_VARIABLES() {
  return Object.freeze(["HOME", "USERPROFILE", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "APPDATA", "LOCALAPPDATA", "CODEX_HOME", "CLAUDE_CONFIG_DIR", "CURSOR_CONFIG_DIR", "GEMINI_CLI_HOME", "OPENCODE_CONFIG_DIR", "QWEN_HOME", "QWEN_RUNTIME_DIR"]);
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

function SETTLE_ATTEMPTS() {
  return 5n;
}

function SETTLE_DELAY() {
  return ml_host_std_time_duration_from_millis(20n);
}

export const translated = { ["PROFILE_VARIABLES"]: PROFILE_VARIABLES(), ["SETTLE_ATTEMPTS"]: SETTLE_ATTEMPTS(), ["SETTLE_DELAY"]: SETTLE_DELAY() };
export const provenance = {"sourcePath":"src/client_lifecycle/active.rs","sourceSha256":"6429b7a699dc500b96f0b9b84fbf9364db604158d7ee4e41cdd133a03e9fbf07","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":23,"preserved":27,"runtimeParity":false};
