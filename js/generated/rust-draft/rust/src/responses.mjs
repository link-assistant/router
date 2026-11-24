// Generated draft from rust/src/responses.rs; sha256=5d00fae1c3f24e678c460381c58f0bc746435910655109d8d4ce2609a01ffea0
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64 } from "../../runtime/json-runtime.mjs";

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

function rp_726573706f6e7365732e73747265616d5f636f6e74656e745f6b6579(event) {
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
    const ml_standard_body_5 = ml_host_option_bind(ml_host_serde_json_value_get_string(event, "content_index"), (ml_host_callback_3_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_3_0); }, "and_then");
    const ml_standard_body_6 = 0n;
    switch (ml_standard_body_5.$) {
      case "None": {
        return ml_standard_body_6;
      }
      case "Some": {
        const x_2 = ml_standard_body_5.field0;
        return x_2;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_5);
      }
    }
  })() });
}

function rp_726573706f6e7365732e657874726163745f7373655f64617461(block) {
  if (!(typeof block === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(block))) throw new TypeError('argument outside supported Rust value domain');
  return ml_str_join(ml_router_collect(ml_router_filter_map(ml_str_lines(block), (line) => { return ml_host_option_map((() => {
    const ml_text_7 = ((text, pattern) => { const chars=Array.from(text); let start=0, end=chars.length; while(end>start&&pattern.includes(chars[end-1]))end--;return chars.slice(start,end).join(''); })(line, Object.freeze(["\r"]));
    const ml_text_8 = "data:";
    return (ml_text_7.startsWith(ml_text_8)?Object.freeze({ $: 'Some', field0: ml_text_7.slice(ml_text_8.length) }):Object.freeze({ $: 'None' }));
  })(), (ml_standard_callback_8_0) => { return (ml_standard_callback_8_0).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, ''); }); })), "\n");
}

function rp_726573706f6e7365732e646f6e655f6672616d65() {
  return "data: [DONE]\n\n";
}

export const translated = { ["stream_content_key"]: rp_726573706f6e7365732e73747265616d5f636f6e74656e745f6b6579, ["extract_sse_data"]: rp_726573706f6e7365732e657874726163745f7373655f64617461, ["done_frame"]: rp_726573706f6e7365732e646f6e655f6672616d65 };
export const provenance = {"sourcePath":"rust/src/responses.rs","sourceSha256":"5d00fae1c3f24e678c460381c58f0bc746435910655109d8d4ce2609a01ffea0","executable":3,"executableFunctions":3,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":18,"preserved":22,"runtimeParity":false};
