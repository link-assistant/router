// Generated draft from rust/src/translation_core/json_edit_candidate.rs; sha256=83a5b86dd9aa37b934e70748e12777cce1769172b7a5de09ab0296ff1b2fb64b
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_bc97c6ab3796d82e55834b297f55eb62d7580a13b2312d43787d0132d3bea00d = {"schemaVersion":1,"types":{"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]}}};

const ml_constructor_value_schema_79bdd79eda92d3ab08f52f7f3bd6a9350077b52564740e375c3ee91c4c52037a = {"schemaVersion":1,"types":{"JsonEditSlot":{"kind":"data","name":"JsonEditSlot","ctors":[{"name":"JsonEditSlot","fields":[{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]}}};

const ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = {"schemaVersion":1,"types":{"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]}}};

const ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = new Map([["serde_json.Number", ml_validate_json_number], ["serde_json.Map_String_Value", ml_validate_json_map]]);

function ml_make_JsonEditSlot_JsonEditSlot(value) {
  ml_assert_constructor_input(value, {"kind":"data","name":"serde_json.Value"}, ml_constructor_value_schema_bc97c6ab3796d82e55834b297f55eb62d7580a13b2312d43787d0132d3bea00d);
  ml_validate_rust_value(value, {"kind":"data","name":"serde_json.Value"}, ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5, { refinements: ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 });
  return ml_snapshot_constructor_value(Object.freeze({ $: "JsonEditSlot", ["value"]: value }), {"kind":"data","name":"JsonEditSlot"}, ml_constructor_value_schema_79bdd79eda92d3ab08f52f7f3bd6a9350077b52564740e375c3ee91c4c52037a);
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

export const translated = { ["JsonEditSlot"]: ml_make_JsonEditSlot_JsonEditSlot };
export const provenance = {"sourcePath":"rust/src/translation_core/json_edit_candidate.rs","sourceSha256":"83a5b86dd9aa37b934e70748e12777cce1769172b7a5de09ab0296ff1b2fb64b","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":6,"preserved":8,"runtimeParity":false};
