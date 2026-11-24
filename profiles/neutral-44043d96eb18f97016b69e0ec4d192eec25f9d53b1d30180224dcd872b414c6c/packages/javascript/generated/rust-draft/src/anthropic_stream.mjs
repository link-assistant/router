// Generated draft from src/anthropic_stream.rs; sha256=fcd91d239af65a88e746f67d6f3c6c7888ae6d467bbc0a75825e02d93eebf6b0
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64 } from "../runtime/json-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_616e7468726f7069635f73747265616d2e6d61705f73746f705f726561736f6e(finish_reason) {
  if (!(typeof finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if ((finish_reason === "length")) {
    return "max_tokens";
  } else {
    if ((finish_reason === "max_tokens")) {
      return "max_tokens";
    } else {
      if ((finish_reason === "max_output_tokens")) {
        return "max_tokens";
      } else {
        if ((finish_reason === "tool_calls")) {
          return "tool_use";
        } else {
          if ((finish_reason === "function_call")) {
            return "tool_use";
          } else {
            if ((finish_reason === "tool_use")) {
              return "tool_use";
            } else {
              return "end_turn";
            }
          }
        }
      }
    }
  }
}

function rp_616e7468726f7069635f73747265616d2e726573706f6e73655f636f6e74656e745f6b6579(event) {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return Object.freeze({ $: 'Tuple', field0: (() => {
    const ml_standard_body_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(event, "output_index"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0); }, "and_then");
    const ml_standard_body_3 = 0n;
    switch (ml_standard_body_2.$) {
      case "None": {
        return ml_standard_body_3;
      }
      case "Some": {
        const x = ml_standard_body_2.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_2);
      }
    }
  })(), field1: (() => {
    const ml_standard_body_2_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(event, "content_index"), (ml_host_callback_0_0_2) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0_2); }, "and_then");
    const ml_standard_body_3_2 = 0n;
    switch (ml_standard_body_2_2.$) {
      case "None": {
        return ml_standard_body_3_2;
      }
      case "Some": {
        const x_2 = ml_standard_body_2_2.field0;
        return x_2;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_2_2);
      }
    }
  })() });
}

export const translated = { ["map_stop_reason"]: rp_616e7468726f7069635f73747265616d2e6d61705f73746f705f726561736f6e, ["response_content_key"]: rp_616e7468726f7069635f73747265616d2e726573706f6e73655f636f6e74656e745f6b6579 };
export const provenance = {"sourcePath":"src/anthropic_stream.rs","sourceSha256":"fcd91d239af65a88e746f67d6f3c6c7888ae6d467bbc0a75825e02d93eebf6b0","executable":2,"executableFunctions":2,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":9,"preserved":12,"runtimeParity":false};
