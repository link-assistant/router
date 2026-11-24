// Generated draft from rust/src/deploy_local/status_report.rs; sha256=3c2790577579b861c0f9cb2192f8b1f48b4a1b82eaa51acb44a8ae20c412c7e2
// Carried constructs are data, never runtime parity evidence.
import { json_macro_null as ml_json_macro_null, json_macro_bool as ml_json_macro_bool, json_macro_string as ml_json_macro_string, json_macro_i64 as ml_json_macro_i64, json_macro_u64 as ml_json_macro_u64, json_macro_value as ml_json_macro_value, json_macro_array as ml_json_macro_array, json_macro_object as ml_json_macro_object } from "../../../runtime/json-macro-runtime.mjs";

function rp_6465706c6f795f6c6f63616c2e7374617475735f7265706f72742e626c6f636b6572(name, reason, forceable) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof forceable === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return ml_json_macro_object([["name", ml_json_macro_string(name)], ["reason", ml_json_macro_string(reason)], ["forceable", ml_json_macro_bool(forceable)]]);
}

export const translated = { ["blocker"]: rp_6465706c6f795f6c6f63616c2e7374617475735f7265706f72742e626c6f636b6572 };
export const provenance = {"sourcePath":"rust/src/deploy_local/status_report.rs","sourceSha256":"3c2790577579b861c0f9cb2192f8b1f48b4a1b82eaa51acb44a8ae20c412c7e2","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":4,"preserved":6,"runtimeParity":false};
