// Generated draft from src/login_api.rs; sha256=b60b17c7777dc6c3fc6bfea570baed1f8d7adf40737f431a4cf7d04697ca55b0
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

function rp_6c6f67696e5f6170692e7265717565737465645f70726f7669646572(value) {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  const ml_s1 = ((ml_router_unwrap(value, "claude", true)).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '')).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  if ((ml_s1 === "claude")) {
    return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Claude' }) });
  } else {
    if ((ml_s1 === "codex")) {
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Codex' }) });
    } else {
      return Object.freeze({ $: 'None' });
    }
  }
}

export const translated = { ["requested_provider"]: rp_6c6f67696e5f6170692e7265717565737465645f70726f7669646572 };
export const provenance = {"sourcePath":"src/login_api.rs","sourceSha256":"b60b17c7777dc6c3fc6bfea570baed1f8d7adf40737f431a4cf7d04697ca55b0","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":17,"preserved":19,"runtimeParity":false};
