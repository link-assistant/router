// Generated draft from rust/src/claude_identity.rs; sha256=bd4440a5694bb8741cd75e1cb438f252f44e43df4d3ac6faebb537e21276b5c9
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str } from "../../runtime/json-runtime.mjs";

import { createVectorRuntime as ml_create_vector_runtime } from "../../runtime/vector-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

const ml_host_rust_vec_first_named_73657264655f6a736f6e_56616c7565 = ml_create_vector_runtime(values => ml_validate_rust_value(values, {"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 })).rust_vec_first;

function rp_636c617564655f6964656e746974792e434c415544455f434f44455f53595354454d5f50524f4d5054() {
  return "You are Claude Code, Anthropic's official CLI for Claude.";
}

function rp_636c617564655f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e() {
  return "2.1.265";
}

function rp_636c617564655f6964656e746974792e69735f6f617574685f63726564656e7469616c(token) {
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  const ml_text_1 = token;
  const ml_text_2 = "sk-ant-oat";
  return ml_text_1.startsWith(ml_text_2);
}

function rp_636c617564655f6964656e746974792e66697273745f626c6f636b5f69735f6964656e74697479(blocks) {
  ml_validate_rust_value(blocks, {"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return (() => {
    const ml_standard_callback_self_4 = ml_host_option_bind(ml_host_option_bind(ml_host_rust_vec_first_named_73657264655f6a736f6e_56616c7565(blocks), (block) => { return ml_host_serde_json_value_get_string(block, "text"); }, "and_then"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
    switch (ml_standard_callback_self_4.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_5 = ml_standard_callback_self_4.field0;
        const ml_standard_callback_arg_6 = ml_standard_pattern_5;
        const text = ml_standard_callback_arg_6;
        const ml_text_2 = text;
        const ml_text_3 = rp_636c617564655f6964656e746974792e434c415544455f434f44455f53595354454d5f50524f4d5054();
        return ml_text_2.startsWith(ml_text_3);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_4);
      }
    }
  })();
}

export const translated = { ["CLAUDE_CODE_SYSTEM_PROMPT"]: rp_636c617564655f6964656e746974792e434c415544455f434f44455f53595354454d5f50524f4d5054(), ["DEFAULT_CLIENT_VERSION"]: rp_636c617564655f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e(), ["is_oauth_credential"]: rp_636c617564655f6964656e746974792e69735f6f617574685f63726564656e7469616c, ["first_block_is_identity"]: rp_636c617564655f6964656e746974792e66697273745f626c6f636b5f69735f6964656e74697479 };
export const provenance = {"sourcePath":"rust/src/claude_identity.rs","sourceSha256":"bd4440a5694bb8741cd75e1cb438f252f44e43df4d3ac6faebb537e21276b5c9","executable":4,"executableFunctions":2,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":12,"runtimeParity":false};
