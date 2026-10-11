// Generated draft from tests/cli_contract_test.rs; sha256=a5090092d6c7221f64a752bc6132bf0899011760ed72f94c6109f037a316a8b1
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function BOOLEAN_ENV() {
  return ml_copy_fixed_array(["DISABLE_ANTHROPIC_API", "DISABLE_OPENAI_API", "DISABLE_METRICS", "DISABLE_LOGIN_API", "VERBOSE", "EXPERIMENTAL_COMPATIBILITY", "MPP_ENABLE"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":7}});
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

export const translated = { ["BOOLEAN_ENV"]: BOOLEAN_ENV() };
export const provenance = {"sourcePath":"tests/cli_contract_test.rs","sourceSha256":"a5090092d6c7221f64a752bc6132bf0899011760ed72f94c6109f037a316a8b1","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":13,"preserved":15,"runtimeParity":false};
