// Generated draft from tests/sse_rechunk_property_test.rs; sha256=dec1cb9d7ea8eadd968a410e2228490845e1f0da3b861abc70de67b8c7ed4b3f
// Carried constructs are data, never runtime parity evidence.
function ml_make_Framing_Framing(comment_before, event_line, multi_line_data) {
  if (!(typeof comment_before === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof event_line === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof multi_line_data === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Framing", ["comment_before"]: comment_before, ["event_line"]: event_line, ["multi_line_data"]: multi_line_data });
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

export const translated = { ["Framing"]: ml_make_Framing_Framing };
export const provenance = {"sourcePath":"tests/sse_rechunk_property_test.rs","sourceSha256":"dec1cb9d7ea8eadd968a410e2228490845e1f0da3b861abc70de67b8c7ed4b3f","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":22,"preserved":24,"runtimeParity":false};
