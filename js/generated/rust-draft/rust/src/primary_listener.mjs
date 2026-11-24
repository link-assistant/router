// Generated draft from rust/src/primary_listener.rs; sha256=001570b8c4cb343a2080d0549b94b6baea4419de2d0ae91a8f063e581850e560
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
export const provenance = {"sourcePath":"rust/src/primary_listener.rs","sourceSha256":"001570b8c4cb343a2080d0549b94b6baea4419de2d0ae91a8f063e581850e560","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":2,"carried":10,"preserved":12,"runtimeParity":false};
