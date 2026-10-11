// Generated draft from src/deploy_local/data_backup.rs; sha256=346c71e03279c446d37df23dfc7d9b1651ef614eb69d53f61de617763d09138e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function LIMIT() {
  return ml_fixed((ml_fixed((256n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
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

function FILES() {
  return 10000n;
}

function DEPTH() {
  return 32n;
}

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e444541444c494e45() {
  return ml_host_std_time_duration_from_secs(10n);
}

function SCHEMA() {
  return "link-assistant-router/data-backup/v1";
}

export const translated = { ["LIMIT"]: LIMIT(), ["FILES"]: FILES(), ["DEPTH"]: DEPTH(), ["DEADLINE"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e444541444c494e45(), ["SCHEMA"]: SCHEMA() };
export const provenance = {"sourcePath":"src/deploy_local/data_backup.rs","sourceSha256":"346c71e03279c446d37df23dfc7d9b1651ef614eb69d53f61de617763d09138e","executable":5,"executableFunctions":0,"executableConstants":5,"executableTypes":0,"executableConstructors":0,"carried":27,"preserved":33,"runtimeParity":false};
