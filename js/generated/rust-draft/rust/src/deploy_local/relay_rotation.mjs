// Generated draft from rust/src/deploy_local/relay_rotation.rs; sha256=d5fefb485b422afd00c0de1a20b621ac786ad8493dd30c3ab0a20c55fd4e7f68
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6465706c6f795f6c6f63616c2e72656c61795f726f746174696f6e2e52454c41595f49444c455f415454454d505453() {
  return 120n;
}

function ml_make_Rotation_Current() {
  return Object.freeze({ $: 'Current' });
}

function ml_make_Rotation_Rotated() {
  return Object.freeze({ $: 'Rotated' });
}

function ml_make_Rotation_Deferred(connections) {
  if (typeof connections !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(connections, 0n, 18446744073709551615n, "u64 argument connections out of range");
  if (!(typeof connections === 'bigint' && connections >= 0n && connections <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Deferred", ["connections"]: connections });
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

export const translated = { ["RELAY_IDLE_ATTEMPTS"]: rp_6465706c6f795f6c6f63616c2e72656c61795f726f746174696f6e2e52454c41595f49444c455f415454454d505453(), ["Rotation"]: Object.freeze({ ["Current"]: ml_make_Rotation_Current, ["Rotated"]: ml_make_Rotation_Rotated, ["Deferred"]: ml_make_Rotation_Deferred }) };
export const provenance = {"sourcePath":"rust/src/deploy_local/relay_rotation.rs","sourceSha256":"d5fefb485b422afd00c0de1a20b621ac786ad8493dd30c3ab0a20c55fd4e7f68","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":3,"carried":4,"preserved":7,"runtimeParity":false};
