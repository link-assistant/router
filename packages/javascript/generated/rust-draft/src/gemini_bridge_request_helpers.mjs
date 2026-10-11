// Generated draft from src/gemini_bridge_request_helpers.rs; sha256=f8e0181a5bfa3311031b883e080e3b23abdecae70f00b9eea89d451199a98281
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function IMAGE_MEDIA_TYPES() {
  return ml_copy_fixed_array(["image/jpeg", "image/png", "image/gif", "image/webp"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":4}});
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

export const translated = { ["IMAGE_MEDIA_TYPES"]: IMAGE_MEDIA_TYPES() };
export const provenance = {"sourcePath":"src/gemini_bridge_request_helpers.rs","sourceSha256":"f8e0181a5bfa3311031b883e080e3b23abdecae70f00b9eea89d451199a98281","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":16,"runtimeParity":false};
