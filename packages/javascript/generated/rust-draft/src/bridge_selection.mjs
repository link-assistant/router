// Generated draft from src/bridge_selection.rs; sha256=b1b06bd11c9567e1b0110aad0b92c28dd9ec7111563e062c78f0bb6fba8af32a
// Carried constructs are data, never runtime parity evidence.
function ml_make_SelectionFailure_NotDiscovered() {
  return Object.freeze({ $: 'NotDiscovered' });
}

function ml_make_SelectionFailure_CredentialUnavailable() {
  return Object.freeze({ $: 'CredentialUnavailable' });
}

function ml_make_SelectionFailure_EmptyCatalog() {
  return Object.freeze({ $: 'EmptyCatalog' });
}

function ml_make_SelectionFailure_ConfiguredModelUnavailable() {
  return Object.freeze({ $: 'ConfiguredModelUnavailable' });
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

function rp_6272696467655f73656c656374696f6e2e4d4f44454c5f53454c454354494f4e5f5245515549524544() {
  return "model_selection_required";
}

export const translated = { ["SelectionFailure"]: Object.freeze({ ["NotDiscovered"]: ml_make_SelectionFailure_NotDiscovered, ["CredentialUnavailable"]: ml_make_SelectionFailure_CredentialUnavailable, ["EmptyCatalog"]: ml_make_SelectionFailure_EmptyCatalog, ["ConfiguredModelUnavailable"]: ml_make_SelectionFailure_ConfiguredModelUnavailable }), ["MODEL_SELECTION_REQUIRED"]: rp_6272696467655f73656c656374696f6e2e4d4f44454c5f53454c454354494f4e5f5245515549524544() };
export const provenance = {"sourcePath":"src/bridge_selection.rs","sourceSha256":"b1b06bd11c9567e1b0110aad0b92c28dd9ec7111563e062c78f0bb6fba8af32a","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":4,"carried":6,"preserved":9,"runtimeParity":false};
