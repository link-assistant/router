// Generated draft from rust/src/openai_tools.rs; sha256=be8257493ce589b6442c1d6e107cee4111011900f7cca9db5a747b949d7e629f
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy } from "../../runtime/copy-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_6f70656e61692e746f6f6c732e69735f7472616e736c617461626c65(tool) {
  ml_validate_rust_value(tool, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const kind = (() => {
    const ml_standard_body_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(tool, "type"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
    const ml_standard_body_3 = "function";
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
  })();
  if ((kind === "function")) {
    return (() => {
    const ml_standard_callback_self_2 = ml_host_option_bind(ml_host_serde_json_value_get_string((() => {
      const ml_standard_body_1 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(tool, "function"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      const ml_standard_body_2_2 = (() => { const ml_shared_immutable_value = tool; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      switch (ml_standard_body_1.$) {
        case "None": {
          return ml_standard_body_2_2;
        }
        case "Some": {
          const x_2 = ml_standard_body_1.field0;
          return x_2;
        }
        default: {
          return ml_router_unexpected(ml_standard_body_1);
        }
      }
    })(), "name"), (ml_host_callback_0_0_2) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0_2); }, "and_then");
    switch (ml_standard_callback_self_2.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_3 = ml_standard_callback_self_2.field0;
        const ml_standard_callback_arg_1 = ml_standard_pattern_3;
        const name = ml_standard_callback_arg_1;
        return !(name.length === 0);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_2);
      }
    }
  })();
  } else {
    if ((kind === "web_search")) {
      return true;
    } else {
      if ((kind === "web_fetch")) {
        return true;
      } else {
        return false;
      }
    }
  }
}

export const translated = { ["is_translatable"]: rp_6f70656e61692e746f6f6c732e69735f7472616e736c617461626c65 };
export const provenance = {"sourcePath":"rust/src/openai_tools.rs","sourceSha256":"be8257493ce589b6442c1d6e107cee4111011900f7cca9db5a747b949d7e629f","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":11,"preserved":12,"runtimeParity":false};
