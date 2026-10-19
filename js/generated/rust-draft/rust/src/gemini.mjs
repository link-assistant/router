// Generated draft from rust/src/gemini.rs; sha256=45fab87a764fdb42974ea14f93bdeaef1c911eb24a825b6507bb429baa186e76
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_pointer as ml_host_serde_json_value_pointer, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy } from "../../runtime/copy-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_67656d696e692e50524f4a4543545f454e56() {
  return "GEMINI_PROJECT";
}

function rp_67656d696e692e4d4f44454c5f4f574e4552() {
  return "google";
}

function rp_67656d696e692e6d61705f66696e6973685f726561736f6e(gemini) {
  if (!(typeof gemini === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(gemini))) throw new TypeError('argument outside supported Rust value domain');
  if ((gemini === "STOP")) {
    return "stop";
  } else {
    if ((gemini === "MAX_TOKENS")) {
      return "length";
    } else {
      return "content_filter";
    }
  }
}

function rp_67656d696e692e67656d696e695f66696e6973685f726561736f6e(response) {
  ml_validate_rust_value(response, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const inner = (() => {
    const ml_standard_body_1 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(response, "response"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    const ml_standard_body_2 = (() => { const ml_shared_immutable_value = response; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
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
  return ml_host_option_bind((() => {
    const ml_standard_body_2_2 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_pointer(inner, "/candidates/0/finishReason"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_body_2_2.$) {
      case "None": {
        const ml_standard_capture_domain_1 = (() => { const ml_shared_immutable_value = inner; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
        return ml_host_serde_json_value_pointer(inner, "/promptFeedback/blockReason");
      }
      case "Some": {
        const ml_standard_alias_field = ml_standard_body_2_2.field0;
        const x_2 = ml_standard_body_2_2;
        return x_2;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_2_2);
      }
    }
  })(), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
}

function ml_make_ShapeIn_Chat() {
  return Object.freeze({ $: 'Chat' });
}

function ml_make_ShapeIn_Responses() {
  return Object.freeze({ $: 'Responses' });
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

export const translated = { ["PROJECT_ENV"]: rp_67656d696e692e50524f4a4543545f454e56(), ["MODEL_OWNER"]: rp_67656d696e692e4d4f44454c5f4f574e4552(), ["map_finish_reason"]: rp_67656d696e692e6d61705f66696e6973685f726561736f6e, ["gemini_finish_reason"]: rp_67656d696e692e67656d696e695f66696e6973685f726561736f6e, ["ShapeIn"]: Object.freeze({ ["Chat"]: ml_make_ShapeIn_Chat, ["Responses"]: ml_make_ShapeIn_Responses }) };
export const provenance = {"sourcePath":"rust/src/gemini.rs","sourceSha256":"45fab87a764fdb42974ea14f93bdeaef1c911eb24a825b6507bb429baa186e76","executable":5,"executableFunctions":2,"executableConstants":2,"executableTypes":1,"executableConstructors":2,"carried":31,"preserved":37,"runtimeParity":false};
