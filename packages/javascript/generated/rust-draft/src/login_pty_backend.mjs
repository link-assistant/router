// Generated draft from src/login_pty_backend.rs; sha256=c808f2dc1cb7c07f2a78c4f4ad4edee6d43fb2f0f37ed4bb0c63a3fc968547e8
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_router_iter(values) { return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

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

function rp_6c6f67696e5f7074795f6261636b656e642e636f6e7461696e735f6d61726b6572(compact, markers) {
  if (!(typeof compact === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(compact))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(markers, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_any(ml_router_iter(markers), (marker) => { return compact.includes(marker); });
}

export const translated = { ["TuiAction"]: Object.freeze({ ["AcceptTheme"]: ml_make_TuiAction_AcceptTheme, ["AcceptWorkspaceTrust"]: ml_make_TuiAction_AcceptWorkspaceTrust, ["SendLogin"]: ml_make_TuiAction_SendLogin, ["SelectLoginMethod"]: ml_make_TuiAction_SelectLoginMethod }), ["contains_marker"]: rp_6c6f67696e5f7074795f6261636b656e642e636f6e7461696e735f6d61726b6572 };
export const provenance = {"sourcePath":"src/login_pty_backend.rs","sourceSha256":"c808f2dc1cb7c07f2a78c4f4ad4edee6d43fb2f0f37ed4bb0c63a3fc968547e8","executable":2,"executableFunctions":1,"executableConstants":0,"executableTypes":1,"executableConstructors":4,"carried":17,"preserved":20,"runtimeParity":false};
