// Generated draft from rust/src/primary_listener.rs; sha256=4ffd6dabbe6d49d06ae134a17a94fb888ef42cc058cf5d8acfc9d67f1ec74b7c
// Carried constructs are data, never runtime parity evidence.
function ml_make_ListenerTransport_Http() {
  return Object.freeze({ $: 'Http' });
}

function ml_make_ListenerTransport_Tls() {
  return Object.freeze({ $: 'Tls' });
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

export const translated = { ["ListenerTransport"]: Object.freeze({ ["Http"]: ml_make_ListenerTransport_Http, ["Tls"]: ml_make_ListenerTransport_Tls }) };
export const provenance = {"sourcePath":"rust/src/primary_listener.rs","sourceSha256":"4ffd6dabbe6d49d06ae134a17a94fb888ef42cc058cf5d8acfc9d67f1ec74b7c","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":2,"carried":10,"preserved":12,"runtimeParity":false};
