// Generated draft from src/auth_remote.rs; sha256=10e9e8cf780427d1a75abcc2ccfa567a69ba7b4d66c26e51646af216466fd05f
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_array as ml_host_serde_json_value_as_array } from "../runtime/json-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

import { assertImmutableIterator as ml_assert_immutable_iterator } from "../runtime/iterator-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function* ml_router_filter_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }

function* ml_router_flatten(values) { for (const value of values) { ml_assert_immutable_iterator(value); yield* Array.prototype.values.call(value); } }

function ml_router_find(values, predicate) { for (const value of values) if (predicate(value)) return Object.freeze({ $: "Some", field0: value }); return Object.freeze({ $: "None" }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_617574685f72656d6f74652e524551554553545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(30n);
}

function rp_617574685f72656d6f74652e504f4c4c5f494e54455256414c() {
  return ml_host_std_time_duration_from_secs(3n);
}

function rp_617574685f72656d6f74652e7374617475735f6f66(view) {
  ml_validate_rust_value(view, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(view, "status"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_2_0); }, "and_then"), "unknown", true);
}

function rp_617574685f72656d6f74652e686f6d655f696e5f6163636f756e7473(body, provider) {
  ml_assert_immutable_iterator(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if (!(typeof provider === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(provider))) throw new TypeError('argument outside supported Rust value domain');
  return ml_host_option_map(ml_host_option_bind(ml_router_find(ml_router_flatten(ml_router_filter_map(ml_router_iter(ml_copy_fixed_array(["credentials", "accounts"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":2}}), false), (key) => { return ml_host_option_bind(ml_host_serde_json_value_get_string(body, key), (ml_host_callback_8_0) => { return ml_host_serde_json_value_as_array(ml_host_callback_8_0); }, "and_then"); })), (entry) => { return ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(entry, "name"), (ml_host_callback_9_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_9_0); }, "and_then"), (name) => { return ((name).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)) === (provider).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32))); }, "is_some_and"); }), (entry_2) => { return ml_host_option_bind(ml_host_serde_json_value_get_string(entry_2, "home"), (ml_host_callback_10_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_10_0); }, "and_then"); }, "and_then"), (ml_standard_callback_11_0) => { return ml_standard_callback_11_0; });
}

export const translated = { ["REQUEST_TIMEOUT"]: rp_617574685f72656d6f74652e524551554553545f54494d454f5554(), ["POLL_INTERVAL"]: rp_617574685f72656d6f74652e504f4c4c5f494e54455256414c(), ["status_of"]: rp_617574685f72656d6f74652e7374617475735f6f66, ["home_in_accounts"]: rp_617574685f72656d6f74652e686f6d655f696e5f6163636f756e7473 };
export const provenance = {"sourcePath":"src/auth_remote.rs","sourceSha256":"10e9e8cf780427d1a75abcc2ccfa567a69ba7b4d66c26e51646af216466fd05f","executable":4,"executableFunctions":2,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":25,"preserved":30,"runtimeParity":false};
