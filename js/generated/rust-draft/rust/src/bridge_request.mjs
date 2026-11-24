// Generated draft from rust/src/bridge_request.rs; sha256=acdba5185dc63148a8a8821c10208ec8ba5c965313df900ee23eecb526695236
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_is_null as ml_host_serde_json_value_is_null, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy, assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view } from "../../runtime/iterator-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function ml_make_BridgeTarget_Responses() {
  return Object.freeze({ $: 'Responses' });
}

function ml_make_BridgeTarget_Chat() {
  return Object.freeze({ $: 'Chat' });
}

function ml_make_BridgeTarget_Gemini() {
  return Object.freeze({ $: 'Gemini' });
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

function rp_6272696467655f726571756573742e756e7472616e736c617461626c655f726573706f6e7365735f7374617465(body) {
  ml_pattern_immutable_view(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const previous = (() => {
    const ml_standard_callback_self_7 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(body, "previous_response_id"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_callback_self_7.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_8 = ml_standard_callback_self_7.field0;
        const ml_standard_callback_arg_9 = ml_standard_pattern_8;
        const value = ml_standard_callback_arg_9;
        return !ml_host_serde_json_value_is_null(value);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_7);
      }
    }
  })();
  const conversation = (() => {
    const ml_standard_callback_self_16 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(body, "conversation"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_callback_self_16.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_17 = ml_standard_callback_self_16.field0;
        const ml_standard_callback_arg_18 = ml_standard_pattern_17;
        const value_2 = ml_standard_callback_arg_18;
        return !ml_host_serde_json_value_is_null(value_2);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_16);
      }
    }
  })();
  const ml_s20 = (() => {
    const ml_match_subject25 = Object.freeze({ $: 'Tuple', field0: previous, field1: conversation });
    ml_pattern_immutable(ml_match_subject25);
    return ml_match_subject25;
  })();
  switch (ml_s20.$) {
    case "Tuple": {
      const ml_f21 = ml_s20.field0;
      const ml_f22 = ml_s20.field1;
      if ((ml_f21 === true)) {
        if ((ml_f22 === true)) {
          return Object.freeze({ $: 'Some', field0: (() => {
        const ml_conversion_source_26 = "previous_response_id and conversation are mutually exclusive and cannot be resolved by an Anthropic bridge; send self-contained input";
        return ml_conversion_source_26;
      })() });
        } else {
          return Object.freeze({ $: 'Some', field0: (() => {
        const ml_conversion_source_27 = "previous_response_id cannot be resolved by an Anthropic bridge; send self-contained input";
        return ml_conversion_source_27;
      })() });
        }
      } else {
        if ((ml_f22 === true)) {
          return Object.freeze({ $: 'Some', field0: (() => {
        const ml_conversion_source_28 = "conversation cannot be resolved by an Anthropic bridge; send self-contained input";
        return ml_conversion_source_28;
      })() });
        } else {
          return Object.freeze({ $: 'None' });
        }
      }
    }
    default: {
      return ml_router_unexpected(ml_s20);
    }
  }
}

function rp_6272696467655f726571756573742e6e6f6e656d707479(value, key) {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if (!(typeof key === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(key))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_callback_self_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(value, key), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
    return (() => {
    const ml_pattern_4 = ml_standard_callback_self_2;
    if ((ml_pattern_immutable(ml_pattern_4) && (ml_pattern_4.$ === "Some"))) {
      const ml_standard_pattern_3 = (ml_pattern_4)["field0"];
      if ((() => {
      const ml_standard_callback_arg_5 = ml_standard_pattern_3;
      const text = ml_standard_callback_arg_5;
      return !(text.length === 0);
    })()) {
        return Object.freeze({ $: 'Some', field0: ml_standard_pattern_3 });
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })();
}

export const translated = { ["BridgeTarget"]: Object.freeze({ ["Responses"]: ml_make_BridgeTarget_Responses, ["Chat"]: ml_make_BridgeTarget_Chat, ["Gemini"]: ml_make_BridgeTarget_Gemini }), ["untranslatable_responses_state"]: rp_6272696467655f726571756573742e756e7472616e736c617461626c655f726573706f6e7365735f7374617465, ["nonempty"]: rp_6272696467655f726571756573742e6e6f6e656d707479 };
export const provenance = {"sourcePath":"rust/src/bridge_request.rs","sourceSha256":"acdba5185dc63148a8a8821c10208ec8ba5c965313df900ee23eecb526695236","executable":3,"executableFunctions":2,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":32,"preserved":36,"runtimeParity":false};
