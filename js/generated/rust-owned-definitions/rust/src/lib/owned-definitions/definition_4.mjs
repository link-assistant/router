import { json_macro_null as ml_json_macro_null, json_macro_bool as ml_json_macro_bool, json_macro_string as ml_json_macro_string, json_macro_i64 as ml_json_macro_i64, json_macro_u64 as ml_json_macro_u64, json_macro_value as ml_json_macro_value, json_macro_array as ml_json_macro_array, json_macro_object as ml_json_macro_object } from "../runtime/json-macro-runtime.mjs";

export function rp_737472756374757265645f6f75747075742e67656e657269635f6f626a6563745f666f726d6174() {
  return ml_json_macro_object([["type", ml_json_macro_string("json_schema")], ["schema", ml_json_macro_object([["type", ml_json_macro_string("object")], ["additionalProperties", ml_json_macro_bool(true)]])]]);
}