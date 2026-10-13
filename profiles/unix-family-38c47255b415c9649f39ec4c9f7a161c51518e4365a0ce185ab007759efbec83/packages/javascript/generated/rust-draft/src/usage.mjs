// Generated draft from src/usage.rs; sha256=58cb4eb54cd5cc9358b24edb70095c02e74bcb895117f476ca9c344727a0cd2a
// Carried constructs are data, never runtime parity evidence.
import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64 } from "../runtime/json-runtime.mjs";

import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from "../runtime/fixed-integer-runtime.mjs";

import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../runtime/copy-runtime.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view, assertImmutableIterator as ml_assert_immutable_iterator } from "../runtime/iterator-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function* ml_router_filter_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function ml_router_fold(values, initial, combine) { let result = initial; for (const value of values) result = combine(result, value); return result; }

function ml_router_find_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") return result; } return Object.freeze({ $: "None" }); }

const ml_router_try_return = Symbol('checked Rust early return');
function ml_router_try(value, option) {
  if (option) {
    if (value.$ === 'Some') return value.field0;
    if (value.$ === 'None') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'None' }) };
  } else {
    if (value.$ === 'Ok') return value.field0;
    if (value.$ === 'Err') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'Err', field0: value.field0 }) };
  }
  throw new TypeError('checked Rust ? operand does not match its standard Option/Result mode');
}
function ml_router_propagated(error) { return error && error[ml_router_try_return] === true; }

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

const ml_host_rust_fixed_saturating_add_u64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_fixed_saturating_add;

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_75736167652e746f6b656e5f636f756e74(value) {
try {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_1 = ml_router_try(rp_75736167652e746f6b656e5f7061727473(value), true);
  ml_pattern_immutable(ml_pattern_1);
  const total = (ml_pattern_1)["field0"];
  const input = (ml_pattern_1)["field1"];
  const output = (ml_pattern_1)["field2"];
  return ml_host_option_bind(total, () => { return Object.freeze({ $: 'Some', field0: ml_host_rust_fixed_saturating_add_u64((() => {
    const ml_standard_body_1 = input;
    const ml_standard_body_2 = 0n;
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
  })(), (() => {
    const ml_standard_body_1_2 = output;
    const ml_standard_body_2_2 = 0n;
    switch (ml_standard_body_1_2.$) {
      case "None": {
        return ml_standard_body_2_2;
      }
      case "Some": {
        const x_2 = ml_standard_body_1_2.field0;
        return x_2;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1_2);
      }
    }
  })()) }); }, "or_else");

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

function rp_75736167652e746f6b656e5f7061727473(value) {
  ml_assert_immutable_iterator(value);
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_1 = ml_host_serde_json_value_get_string(value, "usage");
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
    const usage = (ml_pattern_1)["field0"];
    const ml_pattern_3 = ml_host_option_bind(ml_host_serde_json_value_get_string(usage, "total_tokens"), (ml_host_callback_1_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_1_0); }, "and_then");
    if ((ml_pattern_immutable(ml_pattern_3) && (ml_pattern_3.$ === "Some"))) {
      const total = (ml_pattern_3)["field0"];
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Tuple', field0: Object.freeze({ $: 'Some', field0: total }), field1: Object.freeze({ $: 'None' }), field2: Object.freeze({ $: 'None' }) }) });
    } else {
    }
    const input_2 = ml_host_option_map(rp_75736167652e66697273745f753634(usage, Object.freeze(Object.freeze(["input_tokens", "prompt_tokens"]))), (input) => { return ml_router_fold(ml_router_filter_map(ml_router_iter(ml_copy_fixed_array(["cache_creation_input_tokens", "cache_read_input_tokens"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":2}}), false), (field) => { return ml_host_option_bind(ml_host_serde_json_value_get_string(usage, field), (ml_host_callback_15_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_15_0); }, "and_then"); }), input, (ml_standard_callback_16_0, ml_standard_callback_17_1) => { return ml_host_rust_fixed_saturating_add_u64(ml_standard_callback_16_0, ml_standard_callback_17_1); }); });
    const output = rp_75736167652e66697273745f753634(usage, Object.freeze(Object.freeze(["output_tokens", "completion_tokens"])));
    if (((input_2.$ === 'Some') || (output.$ === 'Some'))) {
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Tuple', field0: Object.freeze({ $: 'None' }), field1: input_2, field2: output }) });
    } else {
    }
  } else {
  }
  const ml_pattern_19 = ml_host_serde_json_value_get_string(value, "usageMetadata");
  if ((ml_pattern_immutable_view(ml_pattern_19) && (ml_pattern_19.$ === "Some"))) {
    const usage_2 = (ml_pattern_19)["field0"];
    const ml_pattern_21 = ml_host_option_bind(ml_host_serde_json_value_get_string(usage_2, "totalTokenCount"), (ml_host_callback_19_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_19_0); }, "and_then");
    if ((ml_pattern_immutable(ml_pattern_21) && (ml_pattern_21.$ === "Some"))) {
      const total_2 = (ml_pattern_21)["field0"];
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Tuple', field0: Object.freeze({ $: 'Some', field0: total_2 }), field1: Object.freeze({ $: 'None' }), field2: Object.freeze({ $: 'None' }) }) });
    } else {
    }
    const input_3 = ml_host_option_bind(ml_host_serde_json_value_get_string(usage_2, "promptTokenCount"), (ml_host_callback_23_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_23_0); }, "and_then");
    const output_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(usage_2, "candidatesTokenCount"), (ml_host_callback_26_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_26_0); }, "and_then");
    if (((input_3.$ === 'Some') || (output_2.$ === 'Some'))) {
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Tuple', field0: Object.freeze({ $: 'None' }), field1: input_3, field2: output_2 }) });
    } else {
    }
  } else {
  }
  return ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(value, "response"), () => { return ml_host_serde_json_value_get_string(value, "message"); }, "or_else"), (ml_host_callback_27_0) => { return rp_75736167652e746f6b656e5f7061727473(ml_host_callback_27_0); }, "and_then");
}

function rp_75736167652e66697273745f753634(value, fields) {
  ml_assert_immutable_iterator(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  ml_assert_immutable_iterator(fields);
  if (!ml_router_array(fields, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_find_map(ml_router_iter(fields, false), (field) => { return ml_host_option_bind(ml_host_serde_json_value_get_string(value, field), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0); }, "and_then"); });
}

function rp_75736167652e455354494d415445445f43484152535f5045525f544f4b454e() {
  return 4n;
}

function ml_make_Settlement_Settlement(tokens, estimated) {
  if (typeof tokens !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(tokens, 0n, 18446744073709551615n, "u64 argument tokens out of range");
  if (!(typeof tokens === 'bigint' && tokens >= 0n && tokens <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof estimated === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Settlement", ["tokens"]: tokens, ["estimated"]: estimated });
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

export const translated = { ["token_count"]: rp_75736167652e746f6b656e5f636f756e74, ["token_parts"]: rp_75736167652e746f6b656e5f7061727473, ["ESTIMATED_CHARS_PER_TOKEN"]: rp_75736167652e455354494d415445445f43484152535f5045525f544f4b454e(), ["Settlement"]: ml_make_Settlement_Settlement, ["first_u64"]: rp_75736167652e66697273745f753634 };
export const provenance = {"sourcePath":"src/usage.rs","sourceSha256":"58cb4eb54cd5cc9358b24edb70095c02e74bcb895117f476ca9c344727a0cd2a","executable":5,"executableFunctions":3,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":12,"preserved":18,"runtimeParity":false};
