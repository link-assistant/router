// Generated draft from src/deploy_relay.rs; sha256=df9ebb29d74eefc749d1587e640e4b54445e7204c5368bc438059cf761576355
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function STATE_ENV() {
  return "ROUTER_DEPLOY_RELAY_STATE";
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

function LISTENERS_ENV() {
  return "ROUTER_DEPLOY_RELAY_LISTENERS";
}

function ml_make_Binding_Binding(listen, backend_port) {
  if (!(typeof listen === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(listen))) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(backend_port, 0n, 65535n, "u16 argument backend_port out of range");
  if (!(typeof backend_port === 'bigint' && backend_port >= 0n && backend_port <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Binding", ["listen"]: listen, ["backend_port"]: backend_port });
}

export const translated = { ["STATE_ENV"]: STATE_ENV(), ["LISTENERS_ENV"]: LISTENERS_ENV(), ["Binding"]: ml_make_Binding_Binding };
export const provenance = {"sourcePath":"src/deploy_relay.rs","sourceSha256":"df9ebb29d74eefc749d1587e640e4b54445e7204c5368bc438059cf761576355","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":17,"preserved":21,"runtimeParity":false};
