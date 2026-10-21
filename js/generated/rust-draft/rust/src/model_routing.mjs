// Generated draft from rust/src/model_routing.rs; sha256=e5a7479d421e89d650c22682fc7ff8b0b32067cd7af9dc5fc7b421a02bf39e3f
// Carried constructs are data, never runtime parity evidence.
function ml_make_ProviderHealthState_Starting() {
  return Object.freeze({ $: 'Starting' });
}

function ml_make_ProviderHealthState_Healthy() {
  return Object.freeze({ $: 'Healthy' });
}

function ml_make_ProviderHealthState_Degraded() {
  return Object.freeze({ $: 'Degraded' });
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

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

export const translated = { ["ProviderHealthState"]: Object.freeze({ ["Starting"]: ml_make_ProviderHealthState_Starting, ["Healthy"]: ml_make_ProviderHealthState_Healthy, ["Degraded"]: ml_make_ProviderHealthState_Degraded }) };
export const provenance = {"sourcePath":"rust/src/model_routing.rs","sourceSha256":"e5a7479d421e89d650c22682fc7ff8b0b32067cd7af9dc5fc7b421a02bf39e3f","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":72,"preserved":74,"runtimeParity":false};
