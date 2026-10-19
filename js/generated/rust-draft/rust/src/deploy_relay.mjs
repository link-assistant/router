// Generated draft from rust/src/deploy_relay.rs; sha256=72a4f919ea1543e956829af791dd805ba613baeceadc8434ca5c6d8e6d16adbe
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6465706c6f795f72656c61792e53544154455f454e56() {
  return "ROUTER_DEPLOY_RELAY_STATE";
}

function rp_6465706c6f795f72656c61792e4c495354454e4552535f454e56() {
  return "ROUTER_DEPLOY_RELAY_LISTENERS";
}

function ml_make_Binding_Binding(listen, backend_port) {
  if (!(typeof listen === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(listen))) throw new TypeError('argument outside supported Rust value domain');
  if (typeof backend_port !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(backend_port, 0n, 65535n, "u16 argument backend_port out of range");
  if (!(typeof backend_port === 'bigint' && backend_port >= 0n && backend_port <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Binding", ["listen"]: listen, ["backend_port"]: backend_port });
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

export const translated = { ["STATE_ENV"]: rp_6465706c6f795f72656c61792e53544154455f454e56(), ["LISTENERS_ENV"]: rp_6465706c6f795f72656c61792e4c495354454e4552535f454e56(), ["Binding"]: ml_make_Binding_Binding };
export const provenance = {"sourcePath":"rust/src/deploy_relay.rs","sourceSha256":"72a4f919ea1543e956829af791dd805ba613baeceadc8434ca5c6d8e6d16adbe","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":17,"preserved":21,"runtimeParity":false};
