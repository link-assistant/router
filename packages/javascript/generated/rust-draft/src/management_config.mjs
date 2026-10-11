// Generated draft from src/management_config.rs; sha256=49ab563e9d5628f4d9cb463be0aca141fb02fc3fd72647217620ae99fe9a0fa5
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_ManagementConfig_ManagementConfig(allow_remote, lockout_failures, lockout_secs, exempt_loopback) {
  if (!(typeof allow_remote === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(lockout_failures, 0n, 4294967295n, "u32 argument lockout_failures out of range");
  if (!(typeof lockout_failures === 'bigint' && lockout_failures >= 0n && lockout_failures <= 4294967295n)) throw new TypeError('argument outside supported Rust value domain');
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

const serde_json = {
  error: {

  },
};

export const translated = { ["ManagementConfig"]: ml_make_ManagementConfig_ManagementConfig };
export const provenance = {"sourcePath":"src/management_config.rs","sourceSha256":"49ab563e9d5628f4d9cb463be0aca141fb02fc3fd72647217620ae99fe9a0fa5","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":6,"preserved":8,"runtimeParity":false};
