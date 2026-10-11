// Generated draft from src/stream_termination.rs; sha256=96e99a807fab7c520d2739fcbb3a0138b1933d7c2c8bfe816db329d257e9e50a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function INCOMPLETE_STREAM_MESSAGE() {
  return "upstream stream ended before completion";
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

function MAX_SSE_CARRY_BYTES() {
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

function ml_make_FailureKind_Stalled() {
  return Object.freeze({ $: 'Stalled' });
}

function ml_make_FailureKind_Interrupted() {
  return Object.freeze({ $: 'Interrupted' });
}

function ml_make_FailureKind_Truncated() {
  return Object.freeze({ $: 'Truncated' });
}

export const translated = { ["INCOMPLETE_STREAM_MESSAGE"]: INCOMPLETE_STREAM_MESSAGE(), ["MAX_SSE_CARRY_BYTES"]: MAX_SSE_CARRY_BYTES(), ["StreamDialect"]: Object.freeze({ ["Anthropic"]: ml_make_StreamDialect_Anthropic, ["OpenAiChat"]: ml_make_StreamDialect_OpenAiChat, ["Responses"]: ml_make_StreamDialect_Responses, ["Gemini"]: ml_make_StreamDialect_Gemini }), ["FailureKind"]: Object.freeze({ ["Stalled"]: ml_make_FailureKind_Stalled, ["Interrupted"]: ml_make_FailureKind_Interrupted, ["Truncated"]: ml_make_FailureKind_Truncated }) };
export const provenance = {"sourcePath":"src/stream_termination.rs","sourceSha256":"96e99a807fab7c520d2739fcbb3a0138b1933d7c2c8bfe816db329d257e9e50a","executable":4,"executableFunctions":0,"executableConstants":2,"executableTypes":2,"executableConstructors":7,"carried":16,"preserved":21,"runtimeParity":false};
