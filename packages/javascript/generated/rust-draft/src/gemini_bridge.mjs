// Generated draft from src/gemini_bridge.rs; sha256=cc8d02c94f8702946c064323d26df9bc4a845f9c84be6294f74497ccd2c183c5
// Carried constructs are data, never runtime parity evidence.
function MODEL_ROLE() {
  return "model";
}

function map_finish_reason(openai) {
  if (!(typeof openai === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(openai))) throw new TypeError('argument outside supported Rust value domain');
  if ((openai === "length")) {
    return "MAX_TOKENS";
  } else {
    if ((openai === "content_filter")) {
      return "SAFETY";
    } else {
      return "STOP";
    }
  }
}

export const translated = { "MODEL_ROLE": MODEL_ROLE(), map_finish_reason };
export const provenance = {"sourcePath":"src/gemini_bridge.rs","sourceSha256":"cc8d02c94f8702946c064323d26df9bc4a845f9c84be6294f74497ccd2c183c5","executable":2,"executableFunctions":1,"executableConstants":1,"carried":7,"preserved":10,"runtimeParity":false};
