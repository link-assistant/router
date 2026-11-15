// Generated draft from rust/src/model_contract.rs; sha256=98bcf7cc0d91d5b0a4f2b30f6f79aebf6d8e761e9cb54372cd135379e5c3e11b
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_pointer as ml_host_serde_json_value_pointer, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view, assertImmutableIterator as ml_assert_immutable_iterator } from "../../runtime/iterator-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function ml_router_find_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") return result; } return Object.freeze({ $: "None" }); }

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_6d6f64656c5f636f6e74726163742e69735f66616c7365(value) {
  if (!(typeof value === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return !value;
}

function rp_6d6f64656c5f636f6e74726163742e7365727665645f6d6f64656c5f66726f6d(payload) {
  ml_assert_immutable_iterator(payload);
  ml_pattern_immutable_view(payload);
  ml_validate_rust_value(payload, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_router_find_map(ml_router_iter(ml_copy_fixed_array(["/model", "/modelVersion", "/response/model", "/response/modelVersion", "/message/model"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":5}}), false), (pointer) => { return (() => {
    const ml_standard_callback_self_2 = ml_host_option_bind(ml_host_serde_json_value_pointer(payload, pointer), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
    return (() => {
    const ml_pattern_4 = ml_standard_callback_self_2;
    if ((ml_pattern_immutable(ml_pattern_4) && (ml_pattern_4.$ === "Some"))) {
      const ml_standard_pattern_3 = (ml_pattern_4)["field0"];
      if ((() => {
      const ml_standard_callback_arg_5 = ml_standard_pattern_3;
      const model = ml_standard_callback_arg_5;
      return !(model.length === 0);
    })()) {
        return Object.freeze({ $: 'Some', field0: ml_standard_pattern_3 });
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })(); });
}

export const translated = { ["is_false"]: rp_6d6f64656c5f636f6e74726163742e69735f66616c7365, ["served_model_from"]: rp_6d6f64656c5f636f6e74726163742e7365727665645f6d6f64656c5f66726f6d };
export const provenance = {"sourcePath":"rust/src/model_contract.rs","sourceSha256":"98bcf7cc0d91d5b0a4f2b30f6f79aebf6d8e761e9cb54372cd135379e5c3e11b","executable":2,"executableFunctions":2,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":20,"preserved":23,"runtimeParity":false};
