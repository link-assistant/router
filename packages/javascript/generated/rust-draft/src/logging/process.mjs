// Generated draft from src/logging/process.rs; sha256=19d6776aca949b23edb64c6ec830729d3947ccf8fe36bd8c0615b051fa84d9e7
// Carried constructs are data, never runtime parity evidence.
function ml_make_ProcessExit_ProcessExit(field0) {
  if (!(typeof field0 === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ProcessExit", ["field0"]: field0 });
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

export const translated = { ["ProcessExit"]: ml_make_ProcessExit_ProcessExit };
export const provenance = {"sourcePath":"src/logging/process.rs","sourceSha256":"19d6776aca949b23edb64c6ec830729d3947ccf8fe36bd8c0615b051fa84d9e7","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":20,"preserved":22,"runtimeParity":false};
