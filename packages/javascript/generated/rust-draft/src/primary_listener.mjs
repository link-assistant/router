// Generated draft from src/primary_listener.rs; sha256=f3ea4e6a2fa7b3a0f1e08b4e78e47eb6ba1b45c3f4254b7b980b2d50f9ac6e3f
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
};

const serde_json = {
  error: {

  },
};

export const translated = { ["ListenerTransport"]: Object.freeze({ ["Http"]: ml_make_ListenerTransport_Http, ["Tls"]: ml_make_ListenerTransport_Tls }) };
export const provenance = {"sourcePath":"src/primary_listener.rs","sourceSha256":"f3ea4e6a2fa7b3a0f1e08b4e78e47eb6ba1b45c3f4254b7b980b2d50f9ac6e3f","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":2,"carried":10,"preserved":12,"runtimeParity":false};
