// Generated draft from src/activitypub.rs; sha256=1eec701e38326ba002bea83922b861fb8c4cae773384fe8c27d7a6a6adba0645
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../runtime/copy-runtime.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view } from "../runtime/iterator-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_61637469766974797075622e41435449564954595f4a534f4e() {
  return "application/activity+json";
}

function rp_61637469766974797075622e726571756972655f737472696e67(activity, field) {
  ml_pattern_immutable_view(activity);
  ml_validate_rust_value(activity, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if (!(typeof field === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_body_1 = (() => {
      const ml_standard_callback_self_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(activity, field), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
      return (() => {
      const ml_pattern_1 = ml_standard_callback_self_2;
      if ((ml_pattern_immutable(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
        const ml_standard_pattern_3 = (ml_pattern_1)["field0"];
        if ((() => {
        const ml_standard_callback_arg_2 = ml_standard_pattern_3;
        const s = ml_standard_callback_arg_2;
        return !(s.length === 0);
      })()) {
          return Object.freeze({ $: 'Some', field0: ml_standard_pattern_3 });
        } else {
        }
      } else {
      }
      return Object.freeze({ $: 'None' });
      })();
    })();
    const ml_standard_body_2 = ((field === "id") ? "activity id is required" : ((field === "type") ? "activity type is required" : "required field is missing"));
    switch (ml_standard_body_1.$) {
      case "None": {
        return Object.freeze({ $: 'Err', field0: ml_standard_body_2 });
      }
      case "Some": {
        const v = ml_standard_body_1.field0;
        return Object.freeze({ $: 'Ok', field0: v });
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1);
      }
    }
  })();
}

export const translated = { ["ACTIVITY_JSON"]: rp_61637469766974797075622e41435449564954595f4a534f4e(), ["require_string"]: rp_61637469766974797075622e726571756972655f737472696e67 };
export const provenance = {"sourcePath":"src/activitypub.rs","sourceSha256":"1eec701e38326ba002bea83922b861fb8c4cae773384fe8c27d7a6a6adba0645","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":21,"preserved":24,"runtimeParity":false};
