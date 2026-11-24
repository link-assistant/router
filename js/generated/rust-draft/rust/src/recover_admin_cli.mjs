// Generated draft from rust/src/recover_admin_cli.rs; sha256=31c13bf9ec3683f90ab2ec65bce9620efa5bb3bf4a4240b0b912a831e01e1af9
// Carried constructs are data, never runtime parity evidence.
import { json_macro_null as ml_json_macro_null, json_macro_bool as ml_json_macro_bool, json_macro_string as ml_json_macro_string, json_macro_i64 as ml_json_macro_i64, json_macro_u64 as ml_json_macro_u64, json_macro_value as ml_json_macro_value, json_macro_array as ml_json_macro_array, json_macro_object as ml_json_macro_object } from "../../runtime/json-macro-runtime.mjs";

function rp_7265636f7665725f61646d696e5f636c692e6661696c7572655f656e76656c6f7065(error) {
  if (!(typeof error === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(error))) throw new TypeError('argument outside supported Rust value domain');
  return ml_json_macro_object([["recovered", ml_json_macro_bool(false)], ["error", ml_json_macro_string(error)]]);
}

export const translated = { ["failure_envelope"]: rp_7265636f7665725f61646d696e5f636c692e6661696c7572655f656e76656c6f7065 };
export const provenance = {"sourcePath":"rust/src/recover_admin_cli.rs","sourceSha256":"31c13bf9ec3683f90ab2ec65bce9620efa5bb3bf4a4240b0b912a831e01e1af9","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":6,"preserved":8,"runtimeParity":false};
