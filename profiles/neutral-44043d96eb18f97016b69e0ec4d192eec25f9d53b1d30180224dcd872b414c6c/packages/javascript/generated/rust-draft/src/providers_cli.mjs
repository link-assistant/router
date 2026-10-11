// Generated draft from src/providers_cli.rs; sha256=3aebe11e2d4a7e8ae58383f756e50a14af7cdca7902132406603fcf75dc977da
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_553e25c9d5c60941635c31afef528c6359eae5b8e916dc2d88b2649276a5bfa3 = {"schemaVersion":1,"types":{"RouterOption_37_named_73657264655f6a736f6e_56616c7565":{"kind":"data","name":"RouterOption_37_named_73657264655f6a736f6e_56616c7565","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Map_String_Value":{"kind":"data","name":"serde_json.Map_String_Value","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"serde_json.MapEntry"}}}]}]},"serde_json.MapEntry":{"kind":"data","name":"serde_json.MapEntry","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"serde_json.Value"}}]}]},"serde_json.Number":{"kind":"data","name":"serde_json.Number","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"serde_json.Value":{"kind":"data","name":"serde_json.Value","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Number"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"serde_json.Value"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Map_String_Value"}}]}]}}};

const ml_host_value_refinements_553e25c9d5c60941635c31afef528c6359eae5b8e916dc2d88b2649276a5bfa3 = new Map([["serde_json.Number", ml_validate_json_number], ["serde_json.Map_String_Value", ml_validate_json_map]]);

function ml_make_Call_Call(method, path, body) {
  if (!(typeof method === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(method))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(body, {"kind":"data","name":"RouterOption_37_named_73657264655f6a736f6e_56616c7565"}, ml_host_value_schema_553e25c9d5c60941635c31afef528c6359eae5b8e916dc2d88b2649276a5bfa3, { refinements: ml_host_value_refinements_553e25c9d5c60941635c31afef528c6359eae5b8e916dc2d88b2649276a5bfa3 });
  return Object.freeze({ $: "Call", ["method"]: method, ["path"]: path, ["body"]: body });
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
export const provenance = {"sourcePath":"src/providers_cli.rs","sourceSha256":"3aebe11e2d4a7e8ae58383f756e50a14af7cdca7902132406603fcf75dc977da","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":23,"preserved":25,"runtimeParity":false};
