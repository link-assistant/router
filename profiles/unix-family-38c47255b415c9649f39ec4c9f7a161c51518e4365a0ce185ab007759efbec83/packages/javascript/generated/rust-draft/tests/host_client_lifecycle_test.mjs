// Generated draft from tests/host_client_lifecycle_test.rs; sha256=07384b5d818a68aa7fdcccb613bee67caff57f459ce2fdbafa3207682df844a2
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function SUPPORTED() {
  return ml_copy_fixed_array(["codex", "claude-code", "opencode", "qwen-code", "agent"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":5}});
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

export const translated = { ["SUPPORTED"]: SUPPORTED() };
export const provenance = {"sourcePath":"tests/host_client_lifecycle_test.rs","sourceSha256":"07384b5d818a68aa7fdcccb613bee67caff57f459ce2fdbafa3207682df844a2","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":16,"preserved":18,"runtimeParity":false};
