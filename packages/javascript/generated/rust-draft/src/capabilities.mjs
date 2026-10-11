// Generated draft from src/capabilities.rs; sha256=7a8bb8a76288590bbc9d556b77d4415cd513837a45d88edb278dc5c6b7b6b222
// Carried constructs are data, never runtime parity evidence.
function ml_make_Capability_Native() {
  return Object.freeze({ $: 'Native' });
}

function ml_make_Capability_Emulated() {
  return Object.freeze({ $: 'Emulated' });
}

function ml_make_Capability_Unsupported() {
  return Object.freeze({ $: 'Unsupported' });
}

function ml_make_Capability_Unknown() {
  return Object.freeze({ $: 'Unknown' });
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

export const translated = { ["Capability"]: Object.freeze({ ["Native"]: ml_make_Capability_Native, ["Emulated"]: ml_make_Capability_Emulated, ["Unsupported"]: ml_make_Capability_Unsupported, ["Unknown"]: ml_make_Capability_Unknown }) };
export const provenance = {"sourcePath":"src/capabilities.rs","sourceSha256":"7a8bb8a76288590bbc9d556b77d4415cd513837a45d88edb278dc5c6b7b6b222","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":4,"carried":14,"preserved":16,"runtimeParity":false};
