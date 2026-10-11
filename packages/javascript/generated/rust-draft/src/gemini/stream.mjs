// Generated draft from src/gemini/stream.rs; sha256=7679cc0876c4893defd551a9c92b19006fd4aaf5ede8250c752b8b2164676389
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_make_SseJsonDecoder_SseJsonDecoder(buffered) {
  if (!ml_router_array(buffered, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "SseJsonDecoder", ["buffered"]: buffered });
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

export const translated = { ["SseJsonDecoder"]: ml_make_SseJsonDecoder_SseJsonDecoder };
export const provenance = {"sourcePath":"src/gemini/stream.rs","sourceSha256":"7679cc0876c4893defd551a9c92b19006fd4aaf5ede8250c752b8b2164676389","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":18,"preserved":20,"runtimeParity":false};
