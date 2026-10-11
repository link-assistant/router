// Generated draft from src/output_limit.rs; sha256=b165be6e33444a5811b33e52567de74ca144e7208a24c161b231bd332cf899e0
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = {"schemaVersion":1,"types":{"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_pointer as ml_host_serde_json_value_pointer, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_array as ml_host_serde_json_value_as_array } from "../runtime/json-runtime.mjs";

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e() {
  return 4n;
}

function ml_make_OutputTokenLimiter_OutputTokenLimiter(remaining, stopped) {
  ml_validate_rust_value(remaining, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  if (!(typeof stopped === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "OutputTokenLimiter", ["remaining"]: remaining, ["stopped"]: stopped });
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

function rp_6f75747075745f6c696d69742e6576656e745f636f6e7461696e735f617373697374616e745f636f6e74656e74(event) {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ((ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "type"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then"), (kind) => { return (((() => {
    const ml_text_2 = kind;
    const ml_text_3 = "output_text.delta";
    return ml_text_2.includes(ml_text_3);
  })() || (() => {
    const ml_text_4 = kind;
    const ml_text_5 = "content_block_delta";
    return ml_text_4.includes(ml_text_5);
  })()) || (() => {
    const ml_text_6 = kind;
    const ml_text_7 = "function_call_arguments.delta";
    return ml_text_6.includes(ml_text_7);
  })()); }, "is_some_and") || ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "choices"), (ml_host_callback_7_0) => { return ml_host_serde_json_value_as_array(ml_host_callback_7_0); }, "and_then"), (choices) => { return !(choices.length === 0); }, "is_some_and")) || ml_host_option_bind(ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "candidates"), () => { return ml_host_serde_json_value_pointer(event, "/response/candidates"); }, "or_else"), (ml_host_callback_8_0) => { return ml_host_serde_json_value_as_array(ml_host_callback_8_0); }, "and_then"), (candidates) => { return !(candidates.length === 0); }, "is_some_and"));
}

export const translated = { ["CHARS_PER_TOKEN"]: rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e(), ["OutputTokenLimiter"]: ml_make_OutputTokenLimiter_OutputTokenLimiter, ["event_contains_assistant_content"]: rp_6f75747075745f6c696d69742e6576656e745f636f6e7461696e735f617373697374616e745f636f6e74656e74 };
export const provenance = {"sourcePath":"src/output_limit.rs","sourceSha256":"b165be6e33444a5811b33e52567de74ca144e7208a24c161b231bd332cf899e0","executable":3,"executableFunctions":1,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":10,"preserved":14,"runtimeParity":false};
