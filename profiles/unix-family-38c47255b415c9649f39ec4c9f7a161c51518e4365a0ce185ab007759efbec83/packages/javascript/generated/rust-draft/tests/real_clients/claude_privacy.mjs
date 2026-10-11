// Generated draft from tests/real_clients/claude_privacy.rs; sha256=ee465f012a05f77a45cf07f524e0d63c7f39713525d4c47d418e41650b37c56b
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function PRIVACY_ENVIRONMENT() {
  return ml_copy_fixed_array(["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "DISABLE_TELEMETRY", "DO_NOT_TRACK", "DISABLE_ERROR_REPORTING", "DISABLE_AUTOUPDATER", "DISABLE_FEEDBACK_COMMAND"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":6}});
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
  num: {

  },
};

const serde_json = {
  error: {

  },
};

export const translated = { ["PRIVACY_ENVIRONMENT"]: PRIVACY_ENVIRONMENT() };
export const provenance = {"sourcePath":"tests/real_clients/claude_privacy.rs","sourceSha256":"ee465f012a05f77a45cf07f524e0d63c7f39713525d4c47d418e41650b37c56b","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":5,"preserved":6,"runtimeParity":false};
