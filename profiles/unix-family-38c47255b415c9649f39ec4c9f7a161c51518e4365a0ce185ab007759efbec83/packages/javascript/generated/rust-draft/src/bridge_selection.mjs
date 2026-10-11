// Generated draft from src/bridge_selection.rs; sha256=b1b06bd11c9567e1b0110aad0b92c28dd9ec7111563e062c78f0bb6fba8af32a
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_cfe0f078cf4e45a6e9ca2d0c00e7e5af40e8e8c3f94134a8b8b6e1fde4c6eafb = {"schemaVersion":1,"types":{"SelectionFailure":{"kind":"data","name":"SelectionFailure","ctors":[{"name":"NotDiscovered","fields":[]},{"name":"CredentialUnavailable","fields":[]},{"name":"EmptyCatalog","fields":[]},{"name":"ConfiguredModelUnavailable","fields":[]}]}}};

const ml_host_value_refinements_cfe0f078cf4e45a6e9ca2d0c00e7e5af40e8e8c3f94134a8b8b6e1fde4c6eafb = new Map([]);

function ml_make_ModelSelectionRequired_ModelSelectionRequired(provider, reason) {
  if (!(typeof provider === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(provider))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(reason, {"kind":"data","name":"SelectionFailure"}, ml_host_value_schema_cfe0f078cf4e45a6e9ca2d0c00e7e5af40e8e8c3f94134a8b8b6e1fde4c6eafb, { refinements: ml_host_value_refinements_cfe0f078cf4e45a6e9ca2d0c00e7e5af40e8e8c3f94134a8b8b6e1fde4c6eafb });
  return Object.freeze({ $: "ModelSelectionRequired", ["provider"]: provider, ["reason"]: reason });
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

function rp_6272696467655f73656c656374696f6e2e4d4f44454c5f53454c454354494f4e5f5245515549524544() {
  return "model_selection_required";
}

export const translated = { ["ModelSelectionRequired"]: ml_make_ModelSelectionRequired_ModelSelectionRequired, ["SelectionFailure"]: Object.freeze({ ["NotDiscovered"]: ml_make_SelectionFailure_NotDiscovered, ["CredentialUnavailable"]: ml_make_SelectionFailure_CredentialUnavailable, ["EmptyCatalog"]: ml_make_SelectionFailure_EmptyCatalog, ["ConfiguredModelUnavailable"]: ml_make_SelectionFailure_ConfiguredModelUnavailable }), ["MODEL_SELECTION_REQUIRED"]: rp_6272696467655f73656c656374696f6e2e4d4f44454c5f53454c454354494f4e5f5245515549524544() };
export const provenance = {"sourcePath":"src/bridge_selection.rs","sourceSha256":"b1b06bd11c9567e1b0110aad0b92c28dd9ec7111563e062c78f0bb6fba8af32a","executable":3,"executableFunctions":0,"executableConstants":1,"executableTypes":2,"executableConstructors":5,"carried":5,"preserved":9,"runtimeParity":false};
