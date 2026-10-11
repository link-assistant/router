// Generated draft from src/login_pty_backend.rs; sha256=c808f2dc1cb7c07f2a78c4f4ad4edee6d43fb2f0f37ed4bb0c63a3fc968547e8
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_87a6267650cfe2e4803146b4e53e470cd0c63d3d00fa0bdf99dce9c526d52e7b = {"schemaVersion":1,"types":{"TuiAction":{"kind":"data","name":"TuiAction","ctors":[{"name":"AcceptTheme","fields":[]},{"name":"AcceptWorkspaceTrust","fields":[]},{"name":"SendLogin","fields":[]},{"name":"SelectLoginMethod","fields":[]}]}}};

const ml_host_value_refinements_87a6267650cfe2e4803146b4e53e470cd0c63d3d00fa0bdf99dce9c526d52e7b = new Map([]);

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

import { assertImmutableIterator as ml_assert_immutable_iterator } from "../runtime/iterator-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

function ml_make_TuiProgress_TuiProgress(completed) {
  ml_validate_rust_value(completed, {"kind":"array","element":{"kind":"data","name":"TuiAction"}}, ml_host_value_schema_87a6267650cfe2e4803146b4e53e470cd0c63d3d00fa0bdf99dce9c526d52e7b, { refinements: ml_host_value_refinements_87a6267650cfe2e4803146b4e53e470cd0c63d3d00fa0bdf99dce9c526d52e7b });
  return Object.freeze({ $: "TuiProgress", ["completed"]: completed });
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

function ml_make_TuiAction_AcceptTheme() {
  return Object.freeze({ $: 'AcceptTheme' });
}

function ml_make_TuiAction_AcceptWorkspaceTrust() {
  return Object.freeze({ $: 'AcceptWorkspaceTrust' });
}

function ml_make_TuiAction_SendLogin() {
  return Object.freeze({ $: 'SendLogin' });
}

function ml_make_TuiAction_SelectLoginMethod() {
  return Object.freeze({ $: 'SelectLoginMethod' });
}

function rp_6c6f67696e5f7074795f6261636b656e642e636f6e7461696e735f6d61726b6572(compact, markers) {
  if (!(typeof compact === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(compact))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(markers, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_any(ml_router_iter(markers, false), (marker) => { const ml_text_1 = compact;
  const ml_text_2 = marker;
  return ml_text_1.includes(ml_text_2); });
}

export const translated = { ["TuiProgress"]: ml_make_TuiProgress_TuiProgress, ["TuiAction"]: Object.freeze({ ["AcceptTheme"]: ml_make_TuiAction_AcceptTheme, ["AcceptWorkspaceTrust"]: ml_make_TuiAction_AcceptWorkspaceTrust, ["SendLogin"]: ml_make_TuiAction_SendLogin, ["SelectLoginMethod"]: ml_make_TuiAction_SelectLoginMethod }), ["contains_marker"]: rp_6c6f67696e5f7074795f6261636b656e642e636f6e7461696e735f6d61726b6572 };
export const provenance = {"sourcePath":"src/login_pty_backend.rs","sourceSha256":"c808f2dc1cb7c07f2a78c4f4ad4edee6d43fb2f0f37ed4bb0c63a3fc968547e8","executable":3,"executableFunctions":1,"executableConstants":0,"executableTypes":2,"executableConstructors":5,"carried":16,"preserved":20,"runtimeParity":false};
