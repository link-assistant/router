// Generated draft from src/lino_json.rs; sha256=0cfd20d20cb98d8a3354db9f94688b02127bd711348ea70f7673ec8f4270ef7e
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = {"schemaVersion":1,"types":{"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]}}};

const ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 = new Map([["serde_json.Number", ml_validate_json_number], ["serde_json.Map_String_Value", ml_validate_json_map]]);

function rp_6c696e6f5f6a736f6e2e41525241595f4d41524b4552() {
  return "#a";
}

function rp_6c696e6f5f6a736f6e2e4f424a4543545f4d41524b4552() {
  return "#o";
}

function rp_6c696e6f5f6a736f6e2e454d5054595f535452494e47() {
  return "%z";
}

function ml_make_Group_Pair(field0, field1) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(field1, {"kind":"data","name":"serde_json.Value"}, ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5, { refinements: ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 });
  return Object.freeze({ $: 'Pair', field0: field0, field1: field1 });
}

function ml_make_Group_NotAPair(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"serde_json.Value"}, ml_host_value_schema_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5, { refinements: ml_host_value_refinements_849f9f53312dcc68578ad585986adeb2f7427fc6c0e1c353ec161a80e66a40d5 });
  return Object.freeze({ $: 'NotAPair', field0: field0 });
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

export const translated = { ["ARRAY_MARKER"]: rp_6c696e6f5f6a736f6e2e41525241595f4d41524b4552(), ["OBJECT_MARKER"]: rp_6c696e6f5f6a736f6e2e4f424a4543545f4d41524b4552(), ["EMPTY_STRING"]: rp_6c696e6f5f6a736f6e2e454d5054595f535452494e47(), ["Group"]: Object.freeze({ ["Pair"]: ml_make_Group_Pair, ["NotAPair"]: ml_make_Group_NotAPair }) };
export const provenance = {"sourcePath":"src/lino_json.rs","sourceSha256":"0cfd20d20cb98d8a3354db9f94688b02127bd711348ea70f7673ec8f4270ef7e","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":2,"carried":26,"preserved":31,"runtimeParity":false};
