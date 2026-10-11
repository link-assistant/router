// Generated draft from src/model_routing.rs; sha256=e5a7479d421e89d650c22682fc7ff8b0b32067cd7af9dc5fc7b421a02bf39e3f
// Carried constructs are data, never runtime parity evidence.
function ml_make_ModelRouteError_ModelRequired() {
  return Object.freeze({ $: 'ModelRequired' });
}

function ml_make_ModelRouteError_NotFound(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'NotFound', field0: field0 });
}

function ml_make_ModelRouteError_AccountUnavailable(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'AccountUnavailable', field0: field0 });
}

function ml_make_ModelRouteError_Conflict(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Conflict', field0: field0 });
}

function ml_make_ModelRouteError_Forbidden(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Forbidden', field0: field0 });
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

function ADVERTISED_IN_ERRORS() {
  return 24n;
}

function ml_make_ProviderHealthState_Starting() {
  return Object.freeze({ $: 'Starting' });
}

function ml_make_ProviderHealthState_Healthy() {
  return Object.freeze({ $: 'Healthy' });
}

function ml_make_ProviderHealthState_Degraded() {
  return Object.freeze({ $: 'Degraded' });
}

export const translated = { ["ModelRouteError"]: Object.freeze({ ["ModelRequired"]: ml_make_ModelRouteError_ModelRequired, ["NotFound"]: ml_make_ModelRouteError_NotFound, ["AccountUnavailable"]: ml_make_ModelRouteError_AccountUnavailable, ["Conflict"]: ml_make_ModelRouteError_Conflict, ["Forbidden"]: ml_make_ModelRouteError_Forbidden }), ["ADVERTISED_IN_ERRORS"]: ADVERTISED_IN_ERRORS(), ["ProviderHealthState"]: Object.freeze({ ["Starting"]: ml_make_ProviderHealthState_Starting, ["Healthy"]: ml_make_ProviderHealthState_Healthy, ["Degraded"]: ml_make_ProviderHealthState_Degraded }) };
export const provenance = {"sourcePath":"src/model_routing.rs","sourceSha256":"e5a7479d421e89d650c22682fc7ff8b0b32067cd7af9dc5fc7b421a02bf39e3f","executable":3,"executableFunctions":0,"executableConstants":1,"executableTypes":2,"executableConstructors":8,"carried":70,"preserved":74,"runtimeParity":false};
