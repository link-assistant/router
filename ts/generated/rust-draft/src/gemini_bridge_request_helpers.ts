
// Generated draft from src/gemini_bridge_request_helpers.rs; sha256=f8e0181a5bfa3311031b883e080e3b23abdecae70f00b9eea89d451199a98281
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function rp_67656d696e695f6272696467652e726571756573742e68656c706572732e494d4147455f4d454449415f5459504553(): ReadonlyArray<string> & { readonly length: 4 } {
  return ml_copy_fixed_array(["image/jpeg", "image/png", "image/gif", "image/webp"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":4}});
}

export const translated: { "IMAGE_MEDIA_TYPES": ReadonlyArray<string> & { readonly length: 4 } } = { ["IMAGE_MEDIA_TYPES"]: rp_67656d696e695f6272696467652e726571756573742e68656c706572732e494d4147455f4d454449415f5459504553() };
export const provenance = {"sourcePath":"src/gemini_bridge_request_helpers.rs","sourceSha256":"f8e0181a5bfa3311031b883e080e3b23abdecae70f00b9eea89d451199a98281","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":16,"runtimeParity":false};
