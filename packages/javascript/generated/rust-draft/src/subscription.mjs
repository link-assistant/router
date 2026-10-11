// Generated draft from src/subscription.rs; sha256=e0949d81ba1a62586fd99dc79fb3e889346bc2fb60e17aa5e3e30f252018ce28
// Carried constructs are data, never runtime parity evidence.
function ml_make_SubscriptionError_NoCredentials(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'NoCredentials', field0: field0 });
}

function ml_make_SubscriptionError_ReadError(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'ReadError', field0: field0 });
}

function ml_make_SubscriptionError_ParseError(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'ParseError', field0: field0 });
}

function ml_make_SubscriptionError_NoToken(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'NoToken', field0: field0 });
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

function ml_make_InstallMode_Replace() {
  return Object.freeze({ $: 'Replace' });
}

function ml_make_InstallMode_IfAbsent() {
  return Object.freeze({ $: 'IfAbsent' });
}

export const translated = { ["SubscriptionError"]: Object.freeze({ ["NoCredentials"]: ml_make_SubscriptionError_NoCredentials, ["ReadError"]: ml_make_SubscriptionError_ReadError, ["ParseError"]: ml_make_SubscriptionError_ParseError, ["NoToken"]: ml_make_SubscriptionError_NoToken }), ["InstallMode"]: Object.freeze({ ["Replace"]: ml_make_InstallMode_Replace, ["IfAbsent"]: ml_make_InstallMode_IfAbsent }) };
export const provenance = {"sourcePath":"src/subscription.rs","sourceSha256":"e0949d81ba1a62586fd99dc79fb3e889346bc2fb60e17aa5e3e30f252018ce28","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":6,"carried":28,"preserved":31,"runtimeParity":false};
