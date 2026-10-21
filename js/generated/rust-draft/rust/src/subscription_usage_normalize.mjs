// Generated draft from rust/src/subscription_usage_normalize.rs; sha256=e62407a433be5cc208254625309fcbb3a6e4f5c4b7110918ecbbeafe38281dad
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../../runtime/fixed-array-runtime.mjs";

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { serde_json_value_pointer as ml_host_serde_json_value_pointer, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_f64 as ml_host_serde_json_value_as_f64, serde_json_value_as_object as ml_host_serde_json_value_as_object, serde_json_map_get as ml_host_serde_json_map_get, serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64, serde_json_value_as_array as ml_host_serde_json_value_as_array } from "../../runtime/json-runtime.mjs";

import { assertImmutableIterator as ml_pattern_immutable_view, assertImmutableIterator as ml_assert_immutable_iterator } from "../../runtime/iterator-runtime.mjs";

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from "../../runtime/fixed-integer-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable, assertImmutableCopy as ml_assert_immutable_copy } from "../../runtime/copy-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function* ml_router_filter_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function ml_router_fold(values, initial, combine) { let result = initial; for (const value of values) result = combine(result, value); return result; }

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

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

const ml_host_rust_fixed_saturating_add_u64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_fixed_saturating_add;

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e414e5448524f5049435f57494e444f5753() {
  return ml_copy_fixed_array(["five_hour", "seven_day", "seven_day_oauth_apps", "seven_day_opus", "seven_day_sonnet", "cinder_cove"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":6}});
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e7265636f676e697a61626c655f616e7468726f7069635f6c696d6974(value) {
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_1 = ml_host_serde_json_value_as_object(value);
  if ((ml_pattern_immutable_view(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
  } else {
    return false;
  }
  const limit = (ml_pattern_1)["field0"];
  return ((((ml_host_option_bind(ml_host_serde_json_map_get(limit, "kind"), (ml_host_callback_3_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_3_0); }, "and_then").$ === 'Some') || (ml_host_option_bind(ml_host_serde_json_map_get(limit, "group"), (ml_host_callback_6_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_6_0); }, "and_then").$ === 'Some')) || (ml_host_option_bind(ml_host_serde_json_value_pointer(value, "/scope/model/display_name"), (ml_host_callback_9_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_9_0); }, "and_then").$ === 'Some')) && ((ml_host_option_bind(ml_host_serde_json_map_get(limit, "percent"), (ml_host_callback_12_0) => { return ml_host_serde_json_value_as_f64(ml_host_callback_12_0); }, "and_then").$ === 'Some') || (ml_host_option_bind(ml_host_serde_json_map_get(limit, "resets_at"), (ml_host_callback_15_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_15_0); }, "and_then").$ === 'Some')));
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e6e756d657269635f6d6573736167655f657374696d617465(value) {
try {
  ml_assert_immutable_iterator(value);
  ml_pattern_immutable_view(value);
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_pattern_1 = ml_host_serde_json_value_as_u64(value);
  if ((ml_pattern_immutable(ml_pattern_1) && (ml_pattern_1.$ === "Some"))) {
    const count = (ml_pattern_1)["field0"];
    return Object.freeze({ $: 'Some', field0: count });
  } else {
  }
  const values = ml_router_try(ml_host_serde_json_value_as_array(value), true);
  const counts = ml_router_collect(ml_router_filter_map(ml_router_iter(values, true), (entry) => { return ml_host_option_bind(ml_host_serde_json_value_get_string(entry, "count"), (ml_host_callback_9_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_9_0); }, "and_then"); }));
  return ml_host_bool_then(!(counts.length === 0), () => { return ml_router_fold(ml_router_iter(counts, false), 0n, (ml_standard_callback_10_0, ml_standard_callback_11_1) => { return ml_host_rust_fixed_saturating_add_u64(ml_standard_callback_10_0, ml_standard_callback_11_1); }); });

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e72657365745f637265646974735f617661696c61626c65(value) {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_host_option_bind(ml_host_option_bind((() => {
    const ml_standard_body_2 = (() => { const ml_shared_immutable_value = ml_host_serde_json_value_get_string(value, "rate_limit_reset_credits"); ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
    switch (ml_standard_body_2.$) {
      case "None": {
        const ml_standard_capture_domain_1 = (() => { const ml_shared_immutable_value = value; ml_assert_immutable_copy(ml_shared_immutable_value); return ml_shared_immutable_value; })();
        return ml_host_serde_json_value_get_string(value, "rate_limit_reset_credits_summary");
      }
      case "Some": {
        const ml_standard_alias_field = ml_standard_body_2.field0;
        const x = ml_standard_body_2;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_2);
      }
    }
  })(), (credits) => { return ml_host_serde_json_value_get_string(credits, "available_count"); }, "and_then"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0); }, "and_then");
}

export const translated = { ["ANTHROPIC_WINDOWS"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e414e5448524f5049435f57494e444f5753(), ["recognizable_anthropic_limit"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e7265636f676e697a61626c655f616e7468726f7069635f6c696d6974, ["numeric_message_estimate"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e6e756d657269635f6d6573736167655f657374696d617465, ["reset_credits_available"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e72657365745f637265646974735f617661696c61626c65 };
export const provenance = {"sourcePath":"rust/src/subscription_usage_normalize.rs","sourceSha256":"e62407a433be5cc208254625309fcbb3a6e4f5c4b7110918ecbbeafe38281dad","executable":4,"executableFunctions":3,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":30,"preserved":34,"runtimeParity":false};
