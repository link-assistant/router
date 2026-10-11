// Generated draft from src/storage.rs; sha256=d301981bd64c7b8726fbe89e13c7d580a66e7219ca5137c70aee0930f30e3050
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = {"schemaVersion":1,"types":{"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]},"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]}}};

const ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = new Map([]);

function ml_make_StorageError_Io(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"std.io.Error"}, ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe, { refinements: ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe });
  return Object.freeze({ $: 'Io', field0: field0 });
}

function ml_make_StorageError_Codec(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Codec', field0: field0 });
}

function ml_make_StorageError_Capacity(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Capacity', field0: field0 });
}

function ml_make_StorageError_LockPoisoned() {
  return Object.freeze({ $: 'LockPoisoned' });
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

function ml_make_RequestAdmission_Admitted() {
  return Object.freeze({ $: 'Admitted' });
}

function ml_make_RequestAdmission_RequestLimitExceeded() {
  return Object.freeze({ $: 'RequestLimitExceeded' });
}

function ml_make_RequestAdmission_TokenLimitExceeded() {
  return Object.freeze({ $: 'TokenLimitExceeded' });
}

function ml_make_RequestAdmission_RateLimitExceeded() {
  return Object.freeze({ $: 'RateLimitExceeded' });
}

export const translated = { ["StorageError"]: Object.freeze({ ["Io"]: ml_make_StorageError_Io, ["Codec"]: ml_make_StorageError_Codec, ["Capacity"]: ml_make_StorageError_Capacity, ["LockPoisoned"]: ml_make_StorageError_LockPoisoned }), ["RequestAdmission"]: Object.freeze({ ["Admitted"]: ml_make_RequestAdmission_Admitted, ["RequestLimitExceeded"]: ml_make_RequestAdmission_RequestLimitExceeded, ["TokenLimitExceeded"]: ml_make_RequestAdmission_TokenLimitExceeded, ["RateLimitExceeded"]: ml_make_RequestAdmission_RateLimitExceeded }) };
export const provenance = {"sourcePath":"src/storage.rs","sourceSha256":"d301981bd64c7b8726fbe89e13c7d580a66e7219ca5137c70aee0930f30e3050","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":8,"carried":42,"preserved":45,"runtimeParity":false};
