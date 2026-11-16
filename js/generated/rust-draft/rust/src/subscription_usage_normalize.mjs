// Generated draft from rust/src/subscription_usage_normalize.rs; sha256=84ad5912f3519fc4e86c63f41dfc9bb47a556d32a6f9424b5440d94ef80883b0
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

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_512471fee2deaf82583c7112bf040c9fa56b3aa7d0e2aea5bee7aed441cf8e99 = {"schemaVersion":1,"types":{"rp_737562736372697074696f6e5f75736167652e74797065732e537562736372697074696f6e5573616765":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e537562736372697074696f6e5573616765","ctors":[{"name":"SubscriptionUsage","fields":[{"name":"provider","type":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572"}},{"name":"state","type":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e55736167655374617465"}},{"name":"status","type":{"kind":"string"}},{"name":"pool","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f37325f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f353537333631363736353530366636663663"}},{"name":"allowed","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"limit_reached","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"plan","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"windows","type":{"kind":"array","element":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676557696e646f77"}}},{"name":"additional_limits","type":{"kind":"array","element":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e4e616d65644c696d6974"}}},{"name":"credits","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f36385f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3433373236353634363937343733"}},{"name":"extra_usage","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f37345f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3435373837343732363135353733363136373635"}},{"name":"spend_control","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f37385f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f353337303635366536343433366636653734373236663663"}},{"name":"rate_limit_reached_type","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"rate_limit_reset_credits_available","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}},{"name":"subscription_end","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"trial_end","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"subscription_created","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"retry_after_seconds","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"ZAi","fields":[]},{"name":"Lefine","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e55736167655374617465":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e55736167655374617465","ctors":[{"name":"Available","fields":[]},{"name":"Unavailable","fields":[]},{"name":"Unverified","fields":[]}]},"rp_526f757465724f7074696f6e5f37325f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f353537333631363736353530366636663663":{"kind":"data","name":"rp_526f757465724f7074696f6e5f37325f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f353537333631363736353530366636663663","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e5573616765506f6f6c"}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e5573616765506f6f6c":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e5573616765506f6f6c","ctors":[{"name":"UsagePool","fields":[{"name":"configured_accounts","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"contributing_accounts","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"unavailable_accounts","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"cooling_down_accounts","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31305f727573745f7573697a65"}},{"name":"paused_accounts","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31305f727573745f7573697a65"}},{"name":"model_cooldowns","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31305f727573745f7573697a65"}}]}]},"rp_526f757465724f7074696f6e5f31305f727573745f7573697a65":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31305f727573745f7573697a65","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]},"rp_526f757465724f7074696f6e5f345f626f6f6c":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"bool"}}]}]},"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e557361676557696e646f77":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676557696e646f77","ctors":[{"name":"UsageWindow","fields":[{"name":"name","type":{"kind":"string"}},{"name":"used_percentage","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"remaining_percentage","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"resets_at","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"window_seconds","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}},{"name":"contributors","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31305f727573745f7573697a65"}},{"name":"reset_times","type":{"kind":"array","element":{"kind":"string"}}}]}]},"rp_526f757465724f7074696f6e5f355f666c6f6174":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_526f757465724f7074696f6e5f335f753634":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e4e616d65644c696d6974":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e4e616d65644c696d6974","ctors":[{"name":"NamedLimit","fields":[{"name":"name","type":{"kind":"string"}},{"name":"limit_name","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"metered_feature","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"kind","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"group","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"model_display_name","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"allowed","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"limit_reached","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"windows","type":{"kind":"array","element":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676557696e646f77"}}},{"name":"used","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"limit","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}}]}]},"rp_526f757465724f7074696f6e5f36385f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3433373236353634363937343733":{"kind":"data","name":"rp_526f757465724f7074696f6e5f36385f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3433373236353634363937343733","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e43726564697473"}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e43726564697473":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e43726564697473","ctors":[{"name":"Credits","fields":[{"name":"balance","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"has_credits","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"unlimited","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"overage_limit_reached","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"approximate_local_messages","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}},{"name":"approximate_cloud_messages","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}}]}]},"rp_526f757465724f7074696f6e5f37345f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3435373837343732363135353733363136373635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f37345f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3435373837343732363135353733363136373635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e45787472615573616765"}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e45787472615573616765":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e45787472615573616765","ctors":[{"name":"ExtraUsage","fields":[{"name":"is_enabled","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"monthly_limit","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"used_credits","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"remaining_credits","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"utilization","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"currency","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"resets_at","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}}]}]},"rp_526f757465724f7074696f6e5f37385f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f353337303635366536343433366636653734373236663663":{"kind":"data","name":"rp_526f757465724f7074696f6e5f37385f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f353337303635366536343433366636653734373236663663","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e5370656e64436f6e74726f6c"}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e5370656e64436f6e74726f6c":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e5370656e64436f6e74726f6c","ctors":[{"name":"SpendControl","fields":[{"name":"reached","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"individual_limit","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f37345f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3533373036353665363434633639366436393734"}}]}]},"rp_526f757465724f7074696f6e5f37345f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3533373036353665363434633639366436393734":{"kind":"data","name":"rp_526f757465724f7074696f6e5f37345f6e616d65645f3733373536323733363337323639373037343639366636653566373537333631363736355f373437393730363537335f3533373036353665363434633639366436393734","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e5370656e644c696d6974"}}]}]},"rp_737562736372697074696f6e5f75736167652e74797065732e5370656e644c696d6974":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e5370656e644c696d6974","ctors":[{"name":"SpendLimit","fields":[{"name":"source","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"limit","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"used","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"remaining","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"used_percentage","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"remaining_percentage","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f355f666c6f6174"}},{"name":"reset_after_seconds","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}},{"name":"resets_at","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}}]}]}}};

const ml_host_value_schema_613a4b6c137cfa0250d57b1aa23a9eebbbd7bcf7291a3c6f5ad365ac6153b14c = {"schemaVersion":1,"types":{"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572":{"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"ZAi","fields":[]},{"name":"Lefine","fields":[]},{"name":"Gemini","fields":[]},{"name":"Qwen","fields":[]}]}}};

const ml_host_value_refinements_613a4b6c137cfa0250d57b1aa23a9eebbbd7bcf7291a3c6f5ad365ac6153b14c = new Map([]);

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
  })(), (credits) => { return ml_host_serde_json_value_get_string(credits, "available_count"); }, "and_then"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_2_0); }, "and_then");
}

function rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e656d7074795f7573616765(provider) {
  ml_validate_rust_value(provider, {"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e557361676550726f7669646572"}, ml_host_value_schema_613a4b6c137cfa0250d57b1aa23a9eebbbd7bcf7291a3c6f5ad365ac6153b14c, { refinements: ml_host_value_refinements_613a4b6c137cfa0250d57b1aa23a9eebbbd7bcf7291a3c6f5ad365ac6153b14c });
  const ml_record1 = provider;
  const ml_record2 = Object.freeze({ $: 'Unverified' });
  const ml_record3 = (() => {
    const ml_conversion_source_4 = "unverified";
    return ml_conversion_source_4;
  })();
  const ml_record5 = Object.freeze({ $: 'None' });
  const ml_record6 = Object.freeze({ $: 'None' });
  const ml_record7 = Object.freeze({ $: 'None' });
  const ml_record8 = Object.freeze({ $: 'None' });
  const ml_record9 = Object.freeze([]);
  const ml_record10 = Object.freeze([]);
  const ml_record11 = Object.freeze({ $: 'None' });
  const ml_record12 = Object.freeze({ $: 'None' });
  const ml_record13 = Object.freeze({ $: 'None' });
  const ml_record14 = Object.freeze({ $: 'None' });
  const ml_record15 = Object.freeze({ $: 'None' });
  const ml_record16 = Object.freeze({ $: 'None' });
  const ml_record17 = Object.freeze({ $: 'None' });
  const ml_record18 = Object.freeze({ $: 'None' });
  const ml_record19 = Object.freeze({ $: 'None' });
  return ml_snapshot_constructor_value(Object.freeze({ $: "SubscriptionUsage", ["provider"]: ml_record1, ["state"]: ml_record2, ["status"]: ml_record3, ["pool"]: ml_record5, ["allowed"]: ml_record6, ["limit_reached"]: ml_record7, ["plan"]: ml_record8, ["windows"]: ml_record9, ["additional_limits"]: ml_record10, ["credits"]: ml_record11, ["extra_usage"]: ml_record12, ["spend_control"]: ml_record13, ["rate_limit_reached_type"]: ml_record14, ["rate_limit_reset_credits_available"]: ml_record15, ["subscription_end"]: ml_record16, ["trial_end"]: ml_record17, ["subscription_created"]: ml_record18, ["retry_after_seconds"]: ml_record19 }), {"kind":"data","name":"rp_737562736372697074696f6e5f75736167652e74797065732e537562736372697074696f6e5573616765"}, ml_constructor_value_schema_512471fee2deaf82583c7112bf040c9fa56b3aa7d0e2aea5bee7aed441cf8e99);
}

export const translated = { ["ANTHROPIC_WINDOWS"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e414e5448524f5049435f57494e444f5753(), ["recognizable_anthropic_limit"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e7265636f676e697a61626c655f616e7468726f7069635f6c696d6974, ["numeric_message_estimate"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e6e756d657269635f6d6573736167655f657374696d617465, ["reset_credits_available"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e72657365745f637265646974735f617661696c61626c65, ["empty_usage"]: rp_737562736372697074696f6e5f75736167652e6e6f726d616c697a652e656d7074795f7573616765 };
export const provenance = {"sourcePath":"rust/src/subscription_usage_normalize.rs","sourceSha256":"84ad5912f3519fc4e86c63f41dfc9bb47a556d32a6f9424b5440d94ef80883b0","executable":5,"executableFunctions":4,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":30,"preserved":35,"runtimeParity":false};
