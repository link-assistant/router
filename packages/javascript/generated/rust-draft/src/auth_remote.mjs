// Generated draft from src/auth_remote.rs; sha256=10e9e8cf780427d1a75abcc2ccfa567a69ba7b4d66c26e51646af216466fd05f
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../runtime/json-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

const ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = {"schemaVersion":1,"types":{"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]}}};

const ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = new Map([["serde_json.Number", ml_validate_json_number], ["serde_json.Map_String_Value", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_617574685f72656d6f74652e524551554553545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(30n);
}

function status_of(view) {
  ml_validate_rust_value(view, {"kind":"data","name":"serde_json.Value"}, ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5, { refinements: ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 });
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(view, "status"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_2_0); }, "and_then"), "unknown", true);
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

export const translated = { ["REQUEST_TIMEOUT"]: rp_617574685f72656d6f74652e524551554553545f54494d454f5554(), ["status_of"]: status_of };
export const provenance = {"sourcePath":"src/auth_remote.rs","sourceSha256":"10e9e8cf780427d1a75abcc2ccfa567a69ba7b4d66c26e51646af216466fd05f","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":27,"preserved":30,"runtimeParity":false};
