// Generated draft from src/bridge_response.rs; sha256=5dc06a1b9326f20e357391fc3aae75ef06ec8c151835b4b257011c3cf0136340
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../runtime/copy-runtime.mjs";

const ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function ml_make_StopSemantics_StopSemantics(chat_finish_reason, response_status, incomplete_reason, refusal) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof response_status === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(response_status))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(incomplete_reason, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (!(typeof refusal === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: chat_finish_reason, ["response_status"]: response_status, ["incomplete_reason"]: incomplete_reason, ["refusal"]: refusal });
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

function rp_6272696467655f726573706f6e73652e73746f705f73656d616e74696373(reason) {
  ml_validate_rust_value(reason, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  const ml_s1 = (() => {
    const ml_standard_body_1 = reason;
    const ml_standard_body_2 = "end_turn";
    switch (ml_standard_body_1.$) {
      case "None": {
        return ml_standard_body_2;
      }
      case "Some": {
        const x = ml_standard_body_1.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1);
      }
    }
  })();
  if ((ml_s1 === "end_turn")) {
    return rp_6272696467655f726573706f6e73652e636f6d706c657465("stop");
  } else {
    if ((ml_s1 === "stop_sequence")) {
      return rp_6272696467655f726573706f6e73652e636f6d706c657465("stop");
    } else {
      if ((ml_s1 === "tool_use")) {
        return rp_6272696467655f726573706f6e73652e636f6d706c657465("tool_calls");
      } else {
        if ((ml_s1 === "refusal")) {
          return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("content_filter", "content_filter", true);
        } else {
          if ((ml_s1 === "max_tokens")) {
            return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
          } else {
            if ((ml_s1 === "pause_turn")) {
              return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
            } else {
              if ((ml_s1 === "model_context_window_exceeded")) {
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
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 });
}

function rp_6272696467655f726573706f6e73652e696e636f6d706c657465(chat_finish_reason, reason, refusal) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof refusal === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "incomplete";
  const ml_record3 = Object.freeze({ $: 'Some', field0: reason });
  const ml_record4 = refusal;
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 });
}

function rp_6272696467655f726573706f6e73652e616e7468726f7069635f736572766963655f746965725f66726f6d5f6f70656e6169(value) {
  ml_pattern_immutable(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}, ml_host_value_schema_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77, { refinements: ml_host_value_refinements_431a38a3c179b8f2f6e2ddc9601e02946483f7baccf5b72b0b5271fcd25f9a77 });
  const ml_s4 = (() => {
    const ml_match_subject7 = ml_host_option_bind(value, (ml_host_callback_5_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_5_0); }, "and_then");
    ml_pattern_immutable(ml_match_subject7);
    return ml_match_subject7;
  })();
  switch (ml_s4.$) {
    case "None": {
      return Object.freeze({ $: 'None' });
    }
    case "Some": {
      const ml_f1 = ml_s4.field0;
      if ((ml_f1 === "default")) {
        return Object.freeze({ $: 'Some', field0: "standard" });
      } else {
        if ((ml_f1 === "auto")) {
          return Object.freeze({ $: 'Some', field0: "standard" });
        } else {
          if ((ml_f1 === "priority")) {
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

export const translated = { ["StopSemantics"]: ml_make_StopSemantics_StopSemantics, ["stop_semantics"]: rp_6272696467655f726573706f6e73652e73746f705f73656d616e74696373, ["complete"]: rp_6272696467655f726573706f6e73652e636f6d706c657465, ["incomplete"]: rp_6272696467655f726573706f6e73652e696e636f6d706c657465, ["anthropic_service_tier_from_openai"]: rp_6272696467655f726573706f6e73652e616e7468726f7069635f736572766963655f746965725f66726f6d5f6f70656e6169 };
export const provenance = {"sourcePath":"src/bridge_response.rs","sourceSha256":"5dc06a1b9326f20e357391fc3aae75ef06ec8c151835b4b257011c3cf0136340","executable":5,"executableFunctions":4,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":15,"preserved":21,"runtimeParity":false};
