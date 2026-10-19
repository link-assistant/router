// Generated draft from rust/src/responses_websocket.rs; sha256=1e03a85abec3035f957494ec5260309017b9b7c90daf8df8cbb3aa0b9769c123
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from "../../runtime/csv-string-runtime.mjs";

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a = {"schemaVersion":1,"types":{"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365":{"kind":"data","name":"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365","ctors":[{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]}]}}};

const ml_host_value_refinements_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a = new Map([]);

function rp_726573706f6e7365735f776562736f636b65742e524553504f4e5345535f50415448() {
  return "/v1/responses";
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f4e414d45445f53545245414d53() {
  return 32n;
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f53545245414d5f49445f4348415253() {
  return 256n;
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f434f4e4e454354494f4e5f414745() {
  return ml_host_std_time_duration_from_secs(ml_fixed((60n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_726573706f6e7365735f776562736f636b65742e434f4e4e4543545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function ml_make_Namespace_OpenAi() {
  return Object.freeze({ $: 'OpenAi' });
}

function ml_make_Namespace_Codex() {
  return Object.freeze({ $: 'Codex' });
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

function rp_726573706f6e7365735f776562736f636b65742e73747265616d5f6964(event) {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_host_option_map(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "stream_id"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then"), (ml_standard_callback_1_0) => { return ml_csv_allocate(ml_standard_callback_1_0); });
}

function rp_726573706f6e7365735f776562736f636b65742e6e616d6573706163655f70617468(namespace) {
  ml_validate_rust_value(namespace, {"kind":"data","name":"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365"}, ml_host_value_schema_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a, { refinements: ml_host_value_refinements_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a });
  switch (namespace.$) {
    case "OpenAi": {
      return "/api/services/openai/v1/responses";
    }
    case "Codex": {
      return "/api/services/codex/v1/responses";
    }
    default: {
      return ml_router_unexpected(namespace);
    }
  }
}

export const translated = { ["RESPONSES_PATH"]: rp_726573706f6e7365735f776562736f636b65742e524553504f4e5345535f50415448(), ["MAX_NAMED_STREAMS"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f4e414d45445f53545245414d53(), ["MAX_STREAM_ID_CHARS"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f53545245414d5f49445f4348415253(), ["MAX_CONNECTION_AGE"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f434f4e4e454354494f4e5f414745(), ["CONNECT_TIMEOUT"]: rp_726573706f6e7365735f776562736f636b65742e434f4e4e4543545f54494d454f5554(), ["Namespace"]: Object.freeze({ ["OpenAi"]: ml_make_Namespace_OpenAi, ["Codex"]: ml_make_Namespace_Codex }), ["stream_id"]: rp_726573706f6e7365735f776562736f636b65742e73747265616d5f6964, ["namespace_path"]: rp_726573706f6e7365735f776562736f636b65742e6e616d6573706163655f70617468 };
export const provenance = {"sourcePath":"rust/src/responses_websocket.rs","sourceSha256":"1e03a85abec3035f957494ec5260309017b9b7c90daf8df8cbb3aa0b9769c123","executable":8,"executableFunctions":2,"executableConstants":5,"executableTypes":1,"executableConstructors":2,"carried":47,"preserved":56,"runtimeParity":false};
