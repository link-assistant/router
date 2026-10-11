// Generated draft from src/deploy_local/data_backup.rs; sha256=346c71e03279c446d37df23dfc7d9b1651ef614eb69d53f61de617763d09138e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e4c494d4954() {
  return ml_fixed((ml_fixed((256n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e46494c4553() {
  return 10000n;
}

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e4445505448() {
  return 32n;
}

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e444541444c494e45() {
  return ml_host_std_time_duration_from_secs(10n);
}

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e434f5645524544() {
  return ml_copy_fixed_array(["providers.lenv", "projects", "sessions"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
}

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e534348454d41() {
  return "link-assistant-router/data-backup/v1";
}

export const translated = { ["LIMIT"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e4c494d4954(), ["FILES"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e46494c4553(), ["DEPTH"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e4445505448(), ["DEADLINE"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e444541444c494e45(), ["COVERED"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e434f5645524544(), ["SCHEMA"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e534348454d41() };
export const provenance = {"sourcePath":"src/deploy_local/data_backup.rs","sourceSha256":"346c71e03279c446d37df23dfc7d9b1651ef614eb69d53f61de617763d09138e","executable":6,"executableFunctions":0,"executableConstants":6,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":33,"runtimeParity":false};
