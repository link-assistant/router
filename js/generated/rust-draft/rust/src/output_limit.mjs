// Generated draft from rust/src/output_limit.rs; sha256=3194c4a5181a08a3cc38d6a4749298c60d62fe849343e81177f500bcaebcf2ce
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = {"schemaVersion":1,"types":{"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_constructor_value_schema_7e0f98d1851e475ca7ace1cf1db37ff812f31009e50df189a6bedef0f9c4a8af = {"schemaVersion":1,"types":{"OutputTokenLimiter":{"kind":"data","name":"OutputTokenLimiter","ctors":[{"name":"OutputTokenLimiter","fields":[{"name":"remaining","type":{"kind":"data","name":"RouterOption_3_u64"}},{"name":"stopped","type":{"kind":"bool"}}]}]},"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = {"schemaVersion":1,"types":{"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_pointer as ml_host_serde_json_value_pointer, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_array as ml_host_serde_json_value_as_array } from "../../runtime/json-runtime.mjs";

import { assertImmutableCopy as ml_assert_immutable_copy } from "../../runtime/copy-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../../runtime/string-iterator-runtime.mjs";

function* ml_router_filter_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e() {
  return 4n;
}

function ml_make_OutputTokenLimiter_OutputTokenLimiter(remaining, stopped) {
  ml_assert_constructor_input(remaining, {"kind":"data","name":"RouterOption_3_u64"}, ml_constructor_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3);
  ml_validate_rust_value(remaining, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  if (!(typeof stopped === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "OutputTokenLimiter", ["remaining"]: remaining, ["stopped"]: stopped }), {"kind":"data","name":"OutputTokenLimiter"}, ml_constructor_value_schema_7e0f98d1851e475ca7ace1cf1db37ff812f31009e50df189a6bedef0f9c4a8af);
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

function rp_6f75747075745f6c696d69742e6576656e745f636f6e7461696e735f617373697374616e745f636f6e74656e74(event) {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return (((() => {
    const ml_standard_callback_self_8 = ml_host_option_bind(ml_host_serde_json_value_get_string(event, "type"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
    switch (ml_standard_callback_self_8.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_9 = ml_standard_callback_self_8.field0;
        const ml_standard_callback_arg_10 = ml_standard_pattern_9;
        const kind = ml_standard_callback_arg_10;
        return (((() => {
          const ml_text_2 = kind;
          const ml_text_3 = "output_text.delta";
          return ml_text_2.includes(ml_text_3);
        })() || (() => {
          const ml_text_4 = kind;
          const ml_text_5 = "content_block_delta";
          return ml_text_4.includes(ml_text_5);
        })()) || (() => {
          const ml_text_6 = kind;
          const ml_text_7 = "function_call_arguments.delta";
          return ml_text_6.includes(ml_text_7);
        })());
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_8);
      }
    }
  })() || (() => {
    const ml_standard_callback_self_12 = (() => { const ml_shared_immutable_value = ml_host_option_bind(ml_host_serde_json_value_get_string(event, "choices"), (ml_host_callback_10_0) => { return ml_host_serde_json_value_as_array(ml_host_callback_10_0); }, "and_then"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_callback_self_12.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_13 = ml_standard_callback_self_12.field0;
        const ml_standard_callback_arg_14 = ml_standard_pattern_13;
        const choices = ml_standard_callback_arg_14;
        return !(choices.length === 0);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_12);
      }
    }
  })()) || (() => {
    const ml_standard_callback_self_18 = (() => { const ml_shared_immutable_value = ml_host_option_bind((() => {
      const ml_standard_body_16 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(event, "candidates"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
      switch (ml_standard_body_16.$) {
        case "None": {
          const ml_standard_capture_domain_15 = (() => { const ml_shared_immutable_value = event; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
          return ml_host_serde_json_value_pointer(event, "/response/candidates");
        }
        case "Some": {
          const ml_standard_alias_field = ml_standard_body_16.field0;
          const x = ml_standard_body_16;
          return x;
        }
        default: {
          return ml_router_unexpected(ml_standard_body_16);
        }
      }
    })(), (ml_host_callback_16_0) => { return ml_host_serde_json_value_as_array(ml_host_callback_16_0); }, "and_then"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_callback_self_18.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_19 = ml_standard_callback_self_18.field0;
        const ml_standard_callback_arg_20 = ml_standard_pattern_19;
        const candidates = ml_standard_callback_arg_20;
        return !(candidates.length === 0);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_18);
      }
    }
  })());
}

function rp_6f75747075745f6c696d69742e646174615f7061796c6f6164(block) {
  if (!(typeof block === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(block))) throw new TypeError('argument outside supported Rust value domain');
  const payload = ml_str_join(ml_router_collect(ml_router_filter_map(ml_str_lines(block), (line) => { return ml_host_option_map((() => {
    const ml_text_25 = ((text, pattern) => { const chars=Array.from(text); let start=0, end=chars.length; while(end>start&&pattern.includes(chars[end-1]))end--;return chars.slice(start,end).join(''); })(line, Object.freeze(["\r"]));
    const ml_text_26 = "data:";
    return (ml_text_25.startsWith(ml_text_26)?Object.freeze({ $: 'Some', field0: ml_text_25.slice(ml_text_26.length) }):Object.freeze({ $: 'None' }));
  })(), (ml_standard_callback_26_0) => { return (ml_standard_callback_26_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ''); }); })), "\n");
  return ml_host_bool_then_some(!(payload.length === 0), payload);
}

export const translated = { ["CHARS_PER_TOKEN"]: rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e(), ["OutputTokenLimiter"]: ml_make_OutputTokenLimiter_OutputTokenLimiter, ["event_contains_assistant_content"]: rp_6f75747075745f6c696d69742e6576656e745f636f6e7461696e735f617373697374616e745f636f6e74656e74, ["data_payload"]: rp_6f75747075745f6c696d69742e646174615f7061796c6f6164 };
export const provenance = {"sourcePath":"rust/src/output_limit.rs","sourceSha256":"3194c4a5181a08a3cc38d6a4749298c60d62fe849343e81177f500bcaebcf2ce","executable":4,"executableFunctions":2,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":9,"preserved":14,"runtimeParity":false};
