// Generated draft from rust/src/management_config.rs; sha256=a29884b105e413edc8aa89a4d326204918311a489ed3e83ffa93842b15ce3e4b
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_ManagementConfig_ManagementConfig(allow_remote, lockout_failures, lockout_secs, exempt_loopback) {
  if (!(typeof allow_remote === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (typeof lockout_failures !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(lockout_failures, 0n, 4294967295n, "u32 argument lockout_failures out of range");
  if (!(typeof lockout_failures === 'bigint' && lockout_failures >= 0n && lockout_failures <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof lockout_secs !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(lockout_secs, 0n, 18446744073709551615n, "u64 argument lockout_secs out of range");
  if (!(typeof lockout_secs === 'bigint' && lockout_secs >= 0n && lockout_secs <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof exempt_loopback === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ManagementConfig", ["allow_remote"]: allow_remote, ["lockout_failures"]: lockout_failures, ["lockout_secs"]: lockout_secs, ["exempt_loopback"]: exempt_loopback });
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

export const translated = { ["ManagementConfig"]: ml_make_ManagementConfig_ManagementConfig };
export const provenance = {"sourcePath":"rust/src/management_config.rs","sourceSha256":"a29884b105e413edc8aa89a4d326204918311a489ed3e83ffa93842b15ce3e4b","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":6,"preserved":8,"runtimeParity":false};
