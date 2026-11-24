// Generated draft from src/response_affinity.rs; sha256=e8aa97145a2df74e399c3c1bc648075f0b72266ed2def6dcc6e17291579dbf41
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_a38ae9b0f048af7d258beba7d2431eaf77d789a509a68d50bd545ce7dd14abe8 = {"schemaVersion":1,"types":{"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]},"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]}}};

const ml_constructor_value_schema_26505a9f1a6bd8828330da82003c02f27b978061b001ab4faeca349acf69833d = {"schemaVersion":1,"types":{"StoreError":{"kind":"data","name":"StoreError","ctors":[{"name":"Io","fields":[{"name":"field0","type":{"kind":"data","name":"std.io.Error"}}]},{"name":"Decode","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Error"}}]},{"name":"Collision","fields":[]},{"name":"Invalid","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]},"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]},"serde_json.Error":{"kind":"data","name":"serde_json.Error","ctors":[{"name":"JsonError","fields":[{"name":"category","type":{"kind":"data","name":"serde_json.error.Category"}},{"name":"line","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"column","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"message","type":{"kind":"string"}}]}]},"serde_json.error.Category":{"kind":"data","name":"serde_json.error.Category","ctors":[{"name":"Io","fields":[]},{"name":"Syntax","fields":[]},{"name":"Data","fields":[]},{"name":"Eof","fields":[]}]}}};

const ml_constructor_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = {"schemaVersion":1,"types":{"serde_json.Error":{"kind":"data","name":"serde_json.Error","ctors":[{"name":"JsonError","fields":[{"name":"category","type":{"kind":"data","name":"serde_json.error.Category"}},{"name":"line","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"column","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"message","type":{"kind":"string"}}]}]},"serde_json.error.Category":{"kind":"data","name":"serde_json.error.Category","ctors":[{"name":"Io","fields":[]},{"name":"Syntax","fields":[]},{"name":"Data","fields":[]},{"name":"Eof","fields":[]}]}}};

const ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = {"schemaVersion":1,"types":{"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]},"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]}}};

const ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = new Map([]);

const ml_host_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = {"schemaVersion":1,"types":{"serde_json.Error":{"kind":"data","name":"serde_json.Error","ctors":[{"name":"JsonError","fields":[{"name":"category","type":{"kind":"data","name":"serde_json.error.Category"}},{"name":"line","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"column","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"message","type":{"kind":"string"}}]}]},"serde_json.error.Category":{"kind":"data","name":"serde_json.error.Category","ctors":[{"name":"Io","fields":[]},{"name":"Syntax","fields":[]},{"name":"Data","fields":[]},{"name":"Eof","fields":[]}]}}};

const ml_host_value_refinements_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = new Map([]);

function rp_726573706f6e73655f616666696e6974792e46494c455f4e414d45() {
  return "response-affinities.lino";
}

function rp_726573706f6e73655f616666696e6974792e53544f52455f56455253494f4e() {
  return 1n;
}

function rp_726573706f6e73655f616666696e6974792e44454641554c545f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((ml_fixed((ml_fixed((30n * 24n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_726573706f6e73655f616666696e6974792e44454641554c545f4d41585f5245434f524453() {
  return 10000n;
}

function rp_726573706f6e73655f616666696e6974792e4d41585f524553504f4e53455f49445f4259544553() {
  return 256n;
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

function ml_make_StoreError_Io(field0) {
  ml_assert_constructor_input(field0, {"kind":"data","name":"std.io.Error"}, ml_constructor_value_schema_a38ae9b0f048af7d258beba7d2431eaf77d789a509a68d50bd545ce7dd14abe8);
  ml_validate_rust_value(field0, {"kind":"data","name":"std.io.Error"}, ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe, { refinements: ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe });
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Io', field0: field0 }), {"kind":"data","name":"StoreError"}, ml_constructor_value_schema_26505a9f1a6bd8828330da82003c02f27b978061b001ab4faeca349acf69833d);
}

function ml_make_StoreError_Decode(field0) {
  ml_assert_constructor_input(field0, {"kind":"data","name":"serde_json.Error"}, ml_constructor_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46);
  ml_validate_rust_value(field0, {"kind":"data","name":"serde_json.Error"}, ml_host_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46, { refinements: ml_host_value_refinements_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 });
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Decode', field0: field0 }), {"kind":"data","name":"StoreError"}, ml_constructor_value_schema_26505a9f1a6bd8828330da82003c02f27b978061b001ab4faeca349acf69833d);
}

function ml_make_StoreError_Collision() {
  return Object.freeze({ $: 'Collision' });
}

function ml_make_StoreError_Invalid(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Invalid', field0: field0 });
}

export const translated = { ["FILE_NAME"]: rp_726573706f6e73655f616666696e6974792e46494c455f4e414d45(), ["STORE_VERSION"]: rp_726573706f6e73655f616666696e6974792e53544f52455f56455253494f4e(), ["DEFAULT_TTL"]: rp_726573706f6e73655f616666696e6974792e44454641554c545f54544c(), ["DEFAULT_MAX_RECORDS"]: rp_726573706f6e73655f616666696e6974792e44454641554c545f4d41585f5245434f524453(), ["MAX_RESPONSE_ID_BYTES"]: rp_726573706f6e73655f616666696e6974792e4d41585f524553504f4e53455f49445f4259544553(), ["RecordOutcome"]: Object.freeze({ ["Inserted"]: ml_make_RecordOutcome_Inserted, ["Existing"]: ml_make_RecordOutcome_Existing }), ["StoreError"]: Object.freeze({ ["Io"]: ml_make_StoreError_Io, ["Decode"]: ml_make_StoreError_Decode, ["Collision"]: ml_make_StoreError_Collision, ["Invalid"]: ml_make_StoreError_Invalid }) };
export const provenance = {"sourcePath":"src/response_affinity.rs","sourceSha256":"e8aa97145a2df74e399c3c1bc648075f0b72266ed2def6dcc6e17291579dbf41","executable":7,"executableFunctions":0,"executableConstants":5,"executableTypes":2,"executableConstructors":6,"carried":22,"preserved":30,"runtimeParity":false};
