import type {JsonValue} from "../runtime/json-macro-runtime.mjs";
import { json_macro_null as ml_json_macro_null, json_macro_bool as ml_json_macro_bool, json_macro_string as ml_json_macro_string, json_macro_i64 as ml_json_macro_i64, json_macro_u64 as ml_json_macro_u64, json_macro_value as ml_json_macro_value, json_macro_array as ml_json_macro_array, json_macro_object as ml_json_macro_object } from "../runtime/json-macro-runtime.mjs";

export function rp_61637469766974797075622e61637469766974797075625f636f6e74657874(): JsonValue {
  return ml_json_macro_array([ml_json_macro_string("https://www.w3.org/ns/activitystreams"), ml_json_macro_string("https://forgefed.org/ns"), ml_json_macro_object([["fep", ml_json_macro_string("https://w3id.org/fep/ef61#")], ["aliases", ml_json_macro_string("fep:aliases")]])]);
}