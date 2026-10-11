// Generated draft from src/token_reservation.rs; sha256=115b9ad5be1a884e67797bb6aa7065da3729d79bd511966f44e35ae8ed734df8
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64 } from "../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../runtime/copy-runtime.mjs";

function ml_router_iter(values) { return Array.prototype.values.call(values); }

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_746f6b656e5f7265736572766174696f6e2e43484152535f5045525f544f4b454e() {
  return 4n;
}

function rp_746f6b656e5f7265736572766174696f6e2e44454641554c545f4d41585f4f55545055545f544f4b454e53() {
  return 4096n;
}

function ml_make_RequestBudget_RequestBudget(input, output) {
  ml_fixed(input, 0n, 18446744073709551615n, "u64 argument input out of range");
  if (!(typeof input === 'bigint' && input >= 0n && input <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(output, 0n, 18446744073709551615n, "u64 argument output out of range");
  if (!(typeof output === 'bigint' && output >= 0n && output <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "RequestBudget", ["input"]: input, ["output"]: output });
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

function rp_746f6b656e5f7265736572766174696f6e2e6465636c617265645f6f75747075745f746f6b656e73(body) {
  ml_pattern_immutable(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  for (const field of ml_router_iter(Object.freeze(["max_output_tokens", "max_completion_tokens", "max_tokens"]))) {
    const ml_pattern_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(body, field), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0); }, "and_then");
    if ((ml_pattern_immutable(ml_pattern_2) && (ml_pattern_2.$ === "Some"))) {
      const value = (ml_pattern_2)["field0"];
      return Object.freeze({ $: 'Some', field0: value });
    } else {
    }
  }
  return ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(body, "generationConfig"), (config) => { return ml_host_serde_json_value_get_string(config, "maxOutputTokens"); }, "and_then"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_2_0); }, "and_then");
}

export const translated = { ["CHARS_PER_TOKEN"]: rp_746f6b656e5f7265736572766174696f6e2e43484152535f5045525f544f4b454e(), ["DEFAULT_MAX_OUTPUT_TOKENS"]: rp_746f6b656e5f7265736572766174696f6e2e44454641554c545f4d41585f4f55545055545f544f4b454e53(), ["RequestBudget"]: ml_make_RequestBudget_RequestBudget, ["declared_output_tokens"]: rp_746f6b656e5f7265736572766174696f6e2e6465636c617265645f6f75747075745f746f6b656e73 };
export const provenance = {"sourcePath":"src/token_reservation.rs","sourceSha256":"115b9ad5be1a884e67797bb6aa7065da3729d79bd511966f44e35ae8ed734df8","executable":4,"executableFunctions":1,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":6,"preserved":11,"runtimeParity":false};
