// Generated draft from src/tokens_remote.rs; sha256=1d1a6a5f5b2b13e358edfe30d2e88f235574481642aa76b0b3016764c5ca3735
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_16cb0a1e1032b5245eda8ef15a1d65f52e43d878f7141e17b21323eb147cdd7a = {"schemaVersion":1,"types":{"RouterOption_37_named_73657264655f6a736f6e_56616c7565":{"kind":"data","name":"RouterOption_37_named_73657264655f6a736f6e_56616c7565","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]}}};

const ml_constructor_value_schema_196072c961e0f991fa3b1b449524d3031053da54a7fbc81b0bab0a0bcdaab700 = {"schemaVersion":1,"types":{"Call":{"kind":"data","name":"Call","ctors":[{"name":"Call","fields":[{"name":"method","type":{"kind":"string"}},{"name":"path","type":{"kind":"string"}},{"name":"body","type":{"kind":"data","name":"RouterOption_37_named_73657264655f6a736f6e_56616c7565"}}]}]},"RouterOption_37_named_73657264655f6a736f6e_56616c7565":{"kind":"data","name":"RouterOption_37_named_73657264655f6a736f6e_56616c7565","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]}}};

const ml_host_value_schema_553e25c9d5c60941635c31afef528c6359eae5b8e916dc2d88b2649276a5bfa3 = {"schemaVersion":1,"types":{"RouterOption_37_named_73657264655f6a736f6e_56616c7565":{"kind":"data","name":"RouterOption_37_named_73657264655f6a736f6e_56616c7565","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]}}};

const ml_host_value_refinements_553e25c9d5c60941635c31afef528c6359eae5b8e916dc2d88b2649276a5bfa3 = new Map([["serde_json.Number", ml_validate_json_number], ["serde_json.Map_String_Value", ml_validate_json_map]]);

function ml_make_Call_Call(method, path, body) {
  if (!(typeof method === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(method))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(body, {"kind":"data","name":"RouterOption_37_named_73657264655f6a736f6e_56616c7565"}, ml_constructor_value_schema_16cb0a1e1032b5245eda8ef15a1d65f52e43d878f7141e17b21323eb147cdd7a);
  ml_validate_rust_value(body, {"kind":"data","name":"RouterOption_37_named_73657264655f6a736f6e_56616c7565"}, ml_host_value_schema_553e25c9d5c60941635c31afef528c6359eae5b8e916dc2d88b2649276a5bfa3, { refinements: ml_host_value_refinements_553e25c9d5c60941635c31afef528c6359eae5b8e916dc2d88b2649276a5bfa3 });
  return ml_snapshot_constructor_value(Object.freeze({ $: "Call", ["method"]: method, ["path"]: path, ["body"]: body }), {"kind":"data","name":"Call"}, ml_constructor_value_schema_196072c961e0f991fa3b1b449524d3031053da54a7fbc81b0bab0a0bcdaab700);
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

export const translated = { ["Call"]: ml_make_Call_Call };
export const provenance = {"sourcePath":"src/tokens_remote.rs","sourceSha256":"1d1a6a5f5b2b13e358edfe30d2e88f235574481642aa76b0b3016764c5ca3735","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":10,"preserved":12,"runtimeParity":false};
