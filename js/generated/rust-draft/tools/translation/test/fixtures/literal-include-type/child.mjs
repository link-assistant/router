// Generated draft from tools/translation/test/fixtures/literal-include-type/child.rs; sha256=64b2a0c60a036400ba7970aefb852db1493c29a4e07a1d4201bd292734f8d155
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function included(value) {
  if (typeof value !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(value, 0n, 255n, "u8 argument value out of range");
  if (!(typeof value === 'bigint' && value >= 0n && value <= 255n)) throw new TypeError('argument outside supported Rust value domain');
  return value;
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

export const translated = { ["included"]: included };
export const provenance = {"sourcePath":"tools/translation/test/fixtures/literal-include-type/child.rs","sourceSha256":"64b2a0c60a036400ba7970aefb852db1493c29a4e07a1d4201bd292734f8d155","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":0,"preserved":1,"runtimeParity":false};
