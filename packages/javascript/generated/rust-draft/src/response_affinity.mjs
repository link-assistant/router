// Generated draft from src/response_affinity.rs; sha256=e8aa97145a2df74e399c3c1bc648075f0b72266ed2def6dcc6e17291579dbf41
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_726573706f6e73655f616666696e6974792e46494c455f4e414d45() {
  return "response-affinities.lino";
}

function rp_726573706f6e73655f616666696e6974792e44454641554c545f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((ml_fixed((ml_fixed((30n * 24n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function ml_make_RecordOutcome_Inserted() {
  return Object.freeze({ $: 'Inserted' });
}

function ml_make_RecordOutcome_Existing() {
  return Object.freeze({ $: 'Existing' });
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

export const translated = { ["FILE_NAME"]: rp_726573706f6e73655f616666696e6974792e46494c455f4e414d45(), ["DEFAULT_TTL"]: rp_726573706f6e73655f616666696e6974792e44454641554c545f54544c(), ["RecordOutcome"]: Object.freeze({ ["Inserted"]: ml_make_RecordOutcome_Inserted, ["Existing"]: ml_make_RecordOutcome_Existing }) };
export const provenance = {"sourcePath":"src/response_affinity.rs","sourceSha256":"e8aa97145a2df74e399c3c1bc648075f0b72266ed2def6dcc6e17291579dbf41","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":2,"carried":26,"preserved":30,"runtimeParity":false};
