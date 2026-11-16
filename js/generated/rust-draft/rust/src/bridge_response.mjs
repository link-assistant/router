// Generated draft from rust/src/bridge_response.rs; sha256=8d8b89372301a53d0d8a96ddc86e9fc96f19c8b51feaf49371adf5120795c3ce
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_427da8f7a6aedc43d8b6a967415c144f7843ae287e3dd929d349cff80f52a1dc = {"schemaVersion":1,"types":{"StopSemantics":{"kind":"data","name":"StopSemantics","ctors":[{"name":"StopSemantics","fields":[{"name":"chat_finish_reason","type":{"kind":"string"}},{"name":"response_status","type":{"kind":"string"}},{"name":"incomplete_reason","type":{"kind":"data","name":"RouterOption_6_string"}},{"name":"refusal","type":{"kind":"bool"}}]}]},"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

const ml_constructor_value_schema_4ec858a8063b439504e03d4fed87f23fce61715fc019c6e79a79571e7e074e9a = {"schemaVersion":1,"types":{"rp_6272696467655f726573706f6e73652e53746f7053656d616e74696373":{"kind":"data","name":"rp_6272696467655f726573706f6e73652e53746f7053656d616e74696373","ctors":[{"name":"StopSemantics","fields":[{"name":"chat_finish_reason","type":{"kind":"string"}},{"name":"response_status","type":{"kind":"string"}},{"name":"incomplete_reason","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"refusal","type":{"kind":"bool"}}]}]},"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_pointer as ml_host_serde_json_value_pointer, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from "../../runtime/fixed-integer-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy, assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

import { json_macro_null as ml_json_macro_null, json_macro_bool as ml_json_macro_bool, json_macro_string as ml_json_macro_string, json_macro_i64 as ml_json_macro_i64, json_macro_u64 as ml_json_macro_u64, json_macro_value as ml_json_macro_value, json_macro_array as ml_json_macro_array, json_macro_object as ml_json_macro_object } from "../../runtime/json-macro-runtime.mjs";

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

const ml_host_rust_fixed_min_u64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_fixed_min;

const ml_host_rust_fixed_saturating_sub_u64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_fixed_saturating_sub;

import { assertImmutableIterator as ml_pattern_immutable_view } from "../../runtime/iterator-runtime.mjs";

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_StopSemantics_StopSemantics(chat_finish_reason, response_status, incomplete_reason, refusal) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof response_status === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(response_status))) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(incomplete_reason, {"kind":"data","name":"RouterOption_6_string"}, ml_constructor_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52);
  ml_validate_rust_value(incomplete_reason, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (!(typeof refusal === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: chat_finish_reason, ["response_status"]: response_status, ["incomplete_reason"]: incomplete_reason, ["refusal"]: refusal }), {"kind":"data","name":"StopSemantics"}, ml_constructor_value_schema_427da8f7a6aedc43d8b6a967415c144f7843ae287e3dd929d349cff80f52a1dc);
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

function rp_6272696467655f726573706f6e73652e73746f705f73656d616e74696373(reason) {
  ml_validate_rust_value(reason, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  const ml_s3 = (() => {
    const ml_standard_body_8 = reason;
    const ml_standard_body_9 = "end_turn";
    switch (ml_standard_body_8.$) {
      case "None": {
        return ml_standard_body_9;
      }
      case "Some": {
        const x = ml_standard_body_8.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_8);
      }
    }
  })();
  if ((ml_s3 === "end_turn")) {
    return rp_6272696467655f726573706f6e73652e636f6d706c657465("stop");
  } else {
    if ((ml_s3 === "stop_sequence")) {
      return rp_6272696467655f726573706f6e73652e636f6d706c657465("stop");
    } else {
      if ((ml_s3 === "tool_use")) {
        return rp_6272696467655f726573706f6e73652e636f6d706c657465("tool_calls");
      } else {
        if ((ml_s3 === "refusal")) {
          return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("content_filter", "content_filter", true);
        } else {
          if ((ml_s3 === "max_tokens")) {
            return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
          } else {
            if ((ml_s3 === "pause_turn")) {
              return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
            } else {
              if ((ml_s3 === "model_context_window_exceeded")) {
                return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
              } else {
                return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
              }
            }
          }
        }
      }
    }
  }
}

function rp_6272696467655f726573706f6e73652e636f6d706c657465(chat_finish_reason) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "completed";
  const ml_record3 = Object.freeze({ $: 'None' });
  const ml_record4 = false;
  return ml_snapshot_constructor_value(Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 }), {"kind":"data","name":"rp_6272696467655f726573706f6e73652e53746f7053656d616e74696373"}, ml_constructor_value_schema_4ec858a8063b439504e03d4fed87f23fce61715fc019c6e79a79571e7e074e9a);
}

function rp_6272696467655f726573706f6e73652e696e636f6d706c657465(chat_finish_reason, reason, refusal) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof refusal === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "incomplete";
  const ml_record3 = Object.freeze({ $: 'Some', field0: reason });
  const ml_record4 = refusal;
  return ml_snapshot_constructor_value(Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 }), {"kind":"data","name":"rp_6272696467655f726573706f6e73652e53746f7053656d616e74696373"}, ml_constructor_value_schema_4ec858a8063b439504e03d4fed87f23fce61715fc019c6e79a79571e7e074e9a);
}

function rp_6272696467655f726573706f6e73652e6f70656e61695f75736167655f746f5f616e7468726f706963(usage) {
  ml_validate_rust_value(usage, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const input_total = (() => {
    const ml_standard_body_14 = ml_host_option_bind(ml_host_option_bind(usage, (value) => { return (() => {
      const ml_standard_body_12 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(value, "input_tokens"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      switch (ml_standard_body_12.$) {
        case "None": {
          const ml_standard_capture_domain_11 = (() => { const ml_shared_immutable_value = value; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
          return ml_host_serde_json_value_get_string(value, "prompt_tokens");
        }
        case "Some": {
          const ml_standard_alias_field = ml_standard_body_12.field0;
          const x = ml_standard_body_12;
          return x;
        }
        default: {
          return ml_router_unexpected(ml_standard_body_12);
        }
      }
    })(); }, "and_then"), (ml_host_callback_12_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_12_0); }, "and_then");
    const ml_standard_body_15 = 0n;
    switch (ml_standard_body_14.$) {
      case "None": {
        return ml_standard_body_15;
      }
      case "Some": {
        const x_2 = ml_standard_body_14.field0;
        return x_2;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_14);
      }
    }
  })();
  const output = (() => {
    const ml_standard_body_29 = ml_host_option_bind(ml_host_option_bind(usage, (value_2) => { return (() => {
      const ml_standard_body_27 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(value_2, "output_tokens"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      switch (ml_standard_body_27.$) {
        case "None": {
          const ml_standard_capture_domain_26 = (() => { const ml_shared_immutable_value = value_2; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
          return ml_host_serde_json_value_get_string(value_2, "completion_tokens");
        }
        case "Some": {
          const ml_standard_alias_field_2 = ml_standard_body_27.field0;
          const x_3 = ml_standard_body_27;
          return x_3;
        }
        default: {
          return ml_router_unexpected(ml_standard_body_27);
        }
      }
    })(); }, "and_then"), (ml_host_callback_27_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_27_0); }, "and_then");
    const ml_standard_body_30 = 0n;
    switch (ml_standard_body_29.$) {
      case "None": {
        return ml_standard_body_30;
      }
      case "Some": {
        const x_4 = ml_standard_body_29.field0;
        return x_4;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_29);
      }
    }
  })();
  const cached = ml_host_rust_fixed_min_u64((() => {
    const ml_standard_body_59 = ml_host_option_bind(ml_host_option_bind(usage, (value_3) => { return (() => {
      const ml_standard_body_57 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_pointer(value_3, "/input_tokens_details/cached_tokens"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      switch (ml_standard_body_57.$) {
        case "None": {
          const ml_standard_capture_domain_56 = (() => { const ml_shared_immutable_value = value_3; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
          return ml_host_serde_json_value_pointer(value_3, "/prompt_tokens_details/cached_tokens");
        }
        case "Some": {
          const ml_standard_alias_field_3 = ml_standard_body_57.field0;
          const x_5 = ml_standard_body_57;
          return x_5;
        }
        default: {
          return ml_router_unexpected(ml_standard_body_57);
        }
      }
    })(); }, "and_then"), (ml_host_callback_57_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_57_0); }, "and_then");
    const ml_standard_body_60 = 0n;
    switch (ml_standard_body_59.$) {
      case "None": {
        return ml_standard_body_60;
      }
      case "Some": {
        const x_6 = ml_standard_body_59.field0;
        return x_6;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_59);
      }
    }
  })(), input_total);
  return ml_json_macro_object([["input_tokens", ml_json_macro_u64(ml_host_rust_fixed_saturating_sub_u64(input_total, cached))], ["cache_creation_input_tokens", ml_json_macro_i64(0n)], ["cache_read_input_tokens", ml_json_macro_u64(cached)], ["output_tokens", ml_json_macro_u64(output)]]);
}

function rp_6272696467655f726573706f6e73652e616e7468726f7069635f736572766963655f746965725f66726f6d5f6f70656e6169(value) {
  ml_pattern_immutable(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const ml_s4 = (() => {
    const ml_match_subject11 = ml_host_option_bind(value, (ml_host_callback_9_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_9_0); }, "and_then");
    ml_pattern_immutable(ml_match_subject11);
    return ml_match_subject11;
  })();
  switch (ml_s4.$) {
    case "None": {
      return Object.freeze({ $: 'None' });
    }
    case "Some": {
      const ml_f5 = ml_s4.field0;
      if ((ml_f5 === "default")) {
        return Object.freeze({ $: 'Some', field0: "standard" });
      } else {
        if ((ml_f5 === "auto")) {
          return Object.freeze({ $: 'Some', field0: "standard" });
        } else {
          if ((ml_f5 === "priority")) {
            return Object.freeze({ $: 'Some', field0: "priority" });
          } else {
            return Object.freeze({ $: 'None' });
          }
        }
      }
    }
    default: {
      return ml_router_unexpected(ml_s4);
    }
  }
}

function rp_6272696467655f726573706f6e73652e6369746174696f6e5f75726c(citation) {
  ml_pattern_immutable_view(citation);
  ml_validate_rust_value(citation, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_ordered_match_2 = (() => {
    const __router_json_reader_0 = ml_host_serde_json_value_get_string(citation, "type");
    const ml_pattern_1 = __router_json_reader_0;
    if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
      const __router_json_reader_1 = (ml_pattern_1)["field0"];
      return ml_host_serde_json_value_as_str(__router_json_reader_1);
    } else {
      return Object.freeze({ $: 'None' });
    }
  })();
  ml_pattern_immutable(ml_ordered_match_2);
  return (() => {
    if (((ml_ordered_match_2.$ === "Some") && ((ml_ordered_match_2)["field0"] === "web_search_result_location"))) {
      return (() => {
    const ml_arm___router_json_reader_2_4 = ml_host_serde_json_value_get_string(citation, "url");
    const ml_arm_ml_pattern_3_5 = ml_arm___router_json_reader_2_4;
    if ((ml_pattern_immutable_view(ml_arm_ml_pattern_3_5) && (ml_arm_ml_pattern_3_5.$ === "Some"))) {
      const ml_arm___router_json_reader_3_6 = (ml_arm_ml_pattern_3_5)["field0"];
      return ml_host_serde_json_value_as_str(ml_arm___router_json_reader_3_6);
    } else {
      return Object.freeze({ $: 'None' });
    }
  })();
    }
    if (((ml_ordered_match_2.$ === "Some") && ((ml_ordered_match_2)["field0"] === "search_result_location"))) {
      return (() => {
    const ml_arm_ml_standard_callback_self_12_19 = (() => {
      const ml_arm___router_json_reader_4_16 = ml_host_serde_json_value_get_string(citation, "source");
      const ml_arm_ml_pattern_7_17 = ml_arm___router_json_reader_4_16;
      if ((ml_pattern_immutable_view(ml_arm_ml_pattern_7_17) && (ml_arm_ml_pattern_7_17.$ === "Some"))) {
        const ml_arm___router_json_reader_5_18 = (ml_arm_ml_pattern_7_17)["field0"];
        return ml_host_serde_json_value_as_str(ml_arm___router_json_reader_5_18);
      } else {
        return Object.freeze({ $: 'None' });
      }
    })();
    return (() => {
    const ml_arm_ml_pattern_14_20 = ml_arm_ml_standard_callback_self_12_19;
    if ((ml_pattern_immutable(ml_arm_ml_pattern_14_20) && (ml_arm_ml_pattern_14_20.$ === "Some"))) {
      const ml_arm_ml_standard_pattern_13_21 = (ml_arm_ml_pattern_14_20)["field0"];
      if ((() => {
      const ml_arm_ml_standard_callback_arg_15_22 = ml_arm_ml_standard_pattern_13_21;
      const ml_arm_source_23 = ml_arm_ml_standard_callback_arg_15_22;
      return ((() => {
        const ml_arm_ml_text_8_24 = ml_arm_source_23;
        const ml_arm_ml_text_9_25 = "https://";
        return ml_arm_ml_text_8_24.startsWith(ml_arm_ml_text_9_25);
      })() || (() => {
        const ml_arm_ml_text_10_26 = ml_arm_source_23;
        const ml_arm_ml_text_11_27 = "http://";
        return ml_arm_ml_text_10_26.startsWith(ml_arm_ml_text_11_27);
      })());
    })()) {
        return Object.freeze({ $: 'Some', field0: ml_arm_ml_standard_pattern_13_21 });
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })();
    }
    if (true) {
      return Object.freeze({ $: 'None' });
    }
    throw new Error("unreachable exhaustive ordered match");
  })();
}

function rp_6272696467655f726573706f6e73652e72657175697265645f616e6e6f746174696f6e5f737472696e67(annotation, field, index) {
  ml_pattern_immutable_view(annotation);
  ml_validate_rust_value(annotation, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if (!(typeof field === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field))) throw new TypeError('argument outside supported Rust value domain');
  if (typeof index !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(index, 0n, 18446744073709551615n, "u64 argument index out of range");
  if (!(typeof index === 'bigint' && index >= 0n && index <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_body_8 = (() => {
      const ml_standard_callback_self_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(annotation, field), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
      return (() => {
      const ml_pattern_4 = ml_standard_callback_self_2;
      if ((ml_pattern_immutable(ml_pattern_4) && (ml_pattern_4.$ === "Some"))) {
        const ml_standard_pattern_3 = (ml_pattern_4)["field0"];
        if ((() => {
        const ml_standard_callback_arg_5 = ml_standard_pattern_3;
        const value = ml_standard_callback_arg_5;
        return !(value.length === 0);
      })()) {
          return Object.freeze({ $: 'Some', field0: ml_standard_pattern_3 });
        } else {
        }
      } else {
      }
      return Object.freeze({ $: 'None' });
      })();
    })();
    switch (ml_standard_body_8.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: (() => {
          const ml_fmt_6 = index;
          const ml_fmt_7 = field;
          return (((("annotations[" + String(ml_fmt_6)) + "].") + ml_fmt_7) + " is required");
        })() });
      }
      case "Some": {
        const v = ml_standard_body_8.field0;
        return Object.freeze({ $: 'Ok', field0: v });
      }
      default: {
        return ml_router_unexpected(ml_standard_body_8);
      }
    }
  })();
}

export const translated = { ["StopSemantics"]: ml_make_StopSemantics_StopSemantics, ["stop_semantics"]: rp_6272696467655f726573706f6e73652e73746f705f73656d616e74696373, ["complete"]: rp_6272696467655f726573706f6e73652e636f6d706c657465, ["incomplete"]: rp_6272696467655f726573706f6e73652e696e636f6d706c657465, ["openai_usage_to_anthropic"]: rp_6272696467655f726573706f6e73652e6f70656e61695f75736167655f746f5f616e7468726f706963, ["anthropic_service_tier_from_openai"]: rp_6272696467655f726573706f6e73652e616e7468726f7069635f736572766963655f746965725f66726f6d5f6f70656e6169, ["citation_url"]: rp_6272696467655f726573706f6e73652e6369746174696f6e5f75726c, ["required_annotation_string"]: rp_6272696467655f726573706f6e73652e72657175697265645f616e6e6f746174696f6e5f737472696e67 };
export const provenance = {"sourcePath":"rust/src/bridge_response.rs","sourceSha256":"8d8b89372301a53d0d8a96ddc86e9fc96f19c8b51feaf49371adf5120795c3ce","executable":8,"executableFunctions":7,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":12,"preserved":21,"runtimeParity":false};
