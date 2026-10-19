
// Generated draft from rust/src/gemini_bridge.rs; sha256=cc8d02c94f8702946c064323d26df9bc4a845f9c84be6294f74497ccd2c183c5
// Carried constructs are data, never runtime parity evidence.
function rp_67656d696e695f6272696467652e4d4f44454c5f524f4c45(): string {
  return "model";
}

function rp_67656d696e695f6272696467652e6d61705f66696e6973685f726561736f6e(openai: string): string {
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

export const translated: { "MODEL_ROLE": string; "map_finish_reason": (openai: string) => string } = { ["MODEL_ROLE"]: rp_67656d696e695f6272696467652e4d4f44454c5f524f4c45(), ["map_finish_reason"]: rp_67656d696e695f6272696467652e6d61705f66696e6973685f726561736f6e };
export const provenance = {"sourcePath":"rust/src/gemini_bridge.rs","sourceSha256":"cc8d02c94f8702946c064323d26df9bc4a845f9c84be6294f74497ccd2c183c5","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":10,"runtimeParity":false};
