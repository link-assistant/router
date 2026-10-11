// Generated draft from src/stream_termination.rs; sha256=96e99a807fab7c520d2739fcbb3a0138b1933d7c2c8bfe816db329d257e9e50a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function rp_73747265616d5f7465726d696e6174696f6e2e494e434f4d504c4554455f53545245414d5f4d455353414745() {
  return "upstream stream ended before completion";
}

function rp_73747265616d5f7465726d696e6174696f6e2e4d41585f5353455f43415252595f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_StreamDialect_Anthropic() {
  return Object.freeze({ $: 'Anthropic' });
}

function ml_make_StreamDialect_OpenAiChat() {
  return Object.freeze({ $: 'OpenAiChat' });
}

function ml_make_StreamDialect_Responses() {
  return Object.freeze({ $: 'Responses' });
}

function ml_make_StreamDialect_Gemini() {
  return Object.freeze({ $: 'Gemini' });
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

function ml_make_FailureKind_Stalled() {
  return Object.freeze({ $: 'Stalled' });
}

function ml_make_FailureKind_Interrupted() {
  return Object.freeze({ $: 'Interrupted' });
}

function ml_make_FailureKind_Truncated() {
  return Object.freeze({ $: 'Truncated' });
}

function ml_make_TerminalEventDetector_TerminalEventDetector(carry, seen) {
  if (!ml_router_array(carry, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof seen === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "TerminalEventDetector", ["carry"]: carry, ["seen"]: seen });
}

export const translated = { ["INCOMPLETE_STREAM_MESSAGE"]: rp_73747265616d5f7465726d696e6174696f6e2e494e434f4d504c4554455f53545245414d5f4d455353414745(), ["MAX_SSE_CARRY_BYTES"]: rp_73747265616d5f7465726d696e6174696f6e2e4d41585f5353455f43415252595f4259544553(), ["StreamDialect"]: Object.freeze({ ["Anthropic"]: ml_make_StreamDialect_Anthropic, ["OpenAiChat"]: ml_make_StreamDialect_OpenAiChat, ["Responses"]: ml_make_StreamDialect_Responses, ["Gemini"]: ml_make_StreamDialect_Gemini }), ["FailureKind"]: Object.freeze({ ["Stalled"]: ml_make_FailureKind_Stalled, ["Interrupted"]: ml_make_FailureKind_Interrupted, ["Truncated"]: ml_make_FailureKind_Truncated }), ["TerminalEventDetector"]: ml_make_TerminalEventDetector_TerminalEventDetector };
export const provenance = {"sourcePath":"src/stream_termination.rs","sourceSha256":"96e99a807fab7c520d2739fcbb3a0138b1933d7c2c8bfe816db329d257e9e50a","executable":5,"executableFunctions":0,"executableConstants":2,"executableTypes":3,"executableConstructors":8,"carried":15,"preserved":21,"runtimeParity":false};
