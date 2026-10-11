// Generated draft from src/subscription_usage_normalize.rs; sha256=e62407a433be5cc208254625309fcbb3a6e4f5c4b7110918ecbbeafe38281dad
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function ANTHROPIC_WINDOWS() {
  return ml_copy_fixed_array(["five_hour", "seven_day", "seven_day_oauth_apps", "seven_day_opus", "seven_day_sonnet", "cinder_cove"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":6}});
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

export const translated = { ["ANTHROPIC_WINDOWS"]: ANTHROPIC_WINDOWS() };
export const provenance = {"sourcePath":"src/subscription_usage_normalize.rs","sourceSha256":"e62407a433be5cc208254625309fcbb3a6e4f5c4b7110918ecbbeafe38281dad","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":33,"preserved":34,"runtimeParity":false};
