import { std_time_duration_as_secs as ml_host_duration_as_secs } from "../runtime/time-runtime.mjs";

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs, std_time_duration_from_millis as ml_host_std_time_duration_from_millis, std_time_duration_min as ml_host_std_time_duration_min } from "../runtime/time-runtime.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_pointer as ml_host_serde_json_value_pointer, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_bool as ml_host_serde_json_value_as_bool, serde_json_value_as_u64 as ml_host_serde_json_value_as_u64, serde_json_value_as_i64 as ml_host_serde_json_value_as_i64, serde_json_value_as_array as ml_host_serde_json_value_as_array } from "../runtime/json-runtime.mjs";

import { createVectorRuntime as ml_create_vector_runtime } from "../runtime/vector-runtime.mjs";

import { createIntegerRuntime as ml_create_integer_runtime } from "../runtime/integer-runtime.mjs";

import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from "../runtime/fixed-integer-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../runtime/copy-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_router_strip(value, search, suffix) {
  const matches = suffix ? value.endsWith(search) : value.startsWith(search);
  if (!matches) return Object.freeze({ $: 'None' });
  const text = suffix ? value.slice(0, value.length - search.length) : value.slice(search.length);
  return Object.freeze({ $: 'Some', field0: text });
}

function ml_router_iter(values) { return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

const ml_router_try_return = Symbol('checked Rust early return');
function ml_router_try(value, option) { if (value.$ === (option ? 'Some' : 'Ok')) return value.field0; throw { [ml_router_try_return]: true, value: option ? Object.freeze({ $: 'None' }) : Object.freeze({ $: 'Err', field0: value.field0 }) }; }
function ml_router_propagated(error) { return error && error[ml_router_try_return] === true; }

const ml_host_value_schema_3bbb892a07e36f83788445e9468b051c145f45b5261c58b6e4334c1a69a531eb = {"schemaVersion":1,"types":{"rp_6163636f756e74732e43726564656e7469616c5374617465":{"kind":"data","name":"rp_6163636f756e74732e43726564656e7469616c5374617465","ctors":[{"name":"Usable","fields":[]},{"name":"Refreshable","fields":[]},{"name":"Rejected","fields":[]},{"name":"Expired","fields":[]},{"name":"Unusable","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_3bbb892a07e36f83788445e9468b051c145f45b5261c58b6e4334c1a69a531eb = new Map([]);

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

const ml_host_value_schema_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 = {"schemaVersion":1,"types":{"rp_6d6574726963732e53757266616365":{"kind":"data","name":"rp_6d6574726963732e53757266616365","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAIChat","fields":[]},{"name":"OpenAIResponses","fields":[]}]}}};

const ml_host_value_refinements_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 = new Map([]);

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

const ml_host_value_schema_4faa4c889e5db4507ae4aa0291f0bac64b58421ba39bcf84a393f774aaa4d426 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635":{"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_6272696467655f726573706f6e73652e416e7468726f7069635573616765":{"kind":"data","name":"rp_6272696467655f726573706f6e73652e416e7468726f7069635573616765","ctors":[{"name":"AnthropicUsage","fields":[{"name":"input_tokens","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"cache_creation_input_tokens","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"cache_read_input_tokens","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"output_tokens","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"service_tier","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"server_tool_use","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635"}}]}]},"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_4faa4c889e5db4507ae4aa0291f0bac64b58421ba39bcf84a393f774aaa4d426 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

const ml_host_value_schema_0099380dfa1b94ae9397ac80bfbd3dbaf27ebbc7d676499c85829e92d78ff5dd = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63654661696c757265":{"kind":"data","name":"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63654661696c757265","ctors":[{"name":"AcceptanceFailure","fields":[{"name":"kind","type":{"kind":"data","name":"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63654661696c7572654b696e64"}},{"name":"phase","type":{"kind":"data","name":"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63655068617365"}},{"name":"transaction_id","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"message","type":{"kind":"string"}}]}]},"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63654661696c7572654b696e64":{"kind":"data","name":"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63654661696c7572654b696e64","ctors":[{"name":"NotAttempted","fields":[]},{"name":"ExchangeRejected","fields":[]},{"name":"ExchangeUncertain","fields":[]},{"name":"PersistenceUncertain","fields":[]},{"name":"SuccessorRetained","fields":[]}]},"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63655068617365":{"kind":"data","name":"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63655068617365","ctors":[{"name":"Preflight","fields":[]},{"name":"Exchange","fields":[]},{"name":"Persistence","fields":[]},{"name":"Catalog","fields":[]},{"name":"Promotion","fields":[]}]}}};

const ml_host_value_refinements_0099380dfa1b94ae9397ac80bfbd3dbaf27ebbc7d676499c85829e92d78ff5dd = new Map([]);

const ml_host_value_schema_8174777fda70e9a8327ecb57b516ca791202637c71f3c24e9fab5964be02934c = {"schemaVersion":1,"types":{"rp_6769745f70726f78792e526566557064617465":{"kind":"data","name":"rp_6769745f70726f78792e526566557064617465","ctors":[{"name":"RefUpdate","fields":[{"name":"old","type":{"kind":"string"}},{"name":"new","type":{"kind":"string"}},{"name":"name","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_8174777fda70e9a8327ecb57b516ca791202637c71f3c24e9fab5964be02934c = new Map([]);

const ml_host_value_schema_571631ada2bf76346eaf7948abd0ec3d28ff64858585f8e25f6db0bdda197e61 = {"schemaVersion":1,"types":{"rp_6c6566696e652e436174616c6f674661696c7572654b696e64":{"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c7572654b696e64","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unavailable","fields":[]}]}}};

const ml_host_value_refinements_571631ada2bf76346eaf7948abd0ec3d28ff64858585f8e25f6db0bdda197e61 = new Map([]);

const ml_host_value_schema_b1dcba45f86d22f78d36c4524144916181cc22ccbffdf6cbc00b60de8b22a990 = {"schemaVersion":1,"types":{"rp_6c6566696e652e436174616c6f674661696c757265":{"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c757265","ctors":[{"name":"CatalogFailure","fields":[{"name":"kind","type":{"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c7572654b696e64"}},{"name":"message","type":{"kind":"string"}}]}]},"rp_6c6566696e652e436174616c6f674661696c7572654b696e64":{"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c7572654b696e64","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unavailable","fields":[]}]}}};

const ml_host_value_refinements_b1dcba45f86d22f78d36c4524144916181cc22ccbffdf6cbc00b60de8b22a990 = new Map([]);

const ml_host_value_schema_0b75292c9407c26cc4ad1e658e26529bf2b189e554b18341bf8ebebf59095918 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f335f753634":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]},"rp_526f757465724f7074696f6e5f345f626f6f6c":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"bool"}}]}]},"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_6c6f675f616e616c797369732e45786368616e6765":{"kind":"data","name":"rp_6c6f675f616e616c797369732e45786368616e6765","ctors":[{"name":"Exchange","fields":[{"name":"correlation_id","type":{"kind":"string"}},{"name":"status","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}},{"name":"upstream_status","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}},{"name":"uri","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"streamed","type":{"kind":"bool"}},{"name":"stream_evidence","type":{"kind":"bool"}},{"name":"response_media_type","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"stream_requested","type":{"kind":"bool"}},{"name":"body_terminated","type":{"kind":"bool"}},{"name":"inspectable","type":{"kind":"bool"}},{"name":"stream_outcome","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"stream_complete","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f345f626f6f6c"}},{"name":"frames","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"undecodable_bodies","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"records","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"stream_error","type":{"kind":"bool"}},{"name":"encoded_frames","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}},{"name":"content_encoding","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}}]}]}}};

const ml_host_value_refinements_0b75292c9407c26cc4ad1e658e26529bf2b189e554b18341bf8ebebf59095918 = new Map([]);

const ml_host_value_schema_df343cfed053ceb5b9ace01836a47f95adea466d00aa1bacd85207c46ae767a7 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_6d70702e4d7070436f6e666967":{"kind":"data","name":"rp_6d70702e4d7070436f6e666967","ctors":[{"name":"MppConfig","fields":[{"name":"enabled","type":{"kind":"bool"}},{"name":"amount","type":{"kind":"string"}},{"name":"currency","type":{"kind":"string"}},{"name":"recipient","type":{"kind":"string"}},{"name":"method","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}}]}]}}};

const ml_host_value_refinements_df343cfed053ceb5b9ace01836a47f95adea466d00aa1bacd85207c46ae767a7 = new Map([]);

const ml_host_value_schema_931c1b14e9c7f25ce67e65592bea8fe26d11385e3b4ef76d393ac3312e5c453a = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f335f753634":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_931c1b14e9c7f25ce67e65592bea8fe26d11385e3b4ef76d393ac3312e5c453a = new Map([]);

const ml_host_value_schema_a848cb195b9218a810902449abf2dc148cf7c8a29b7f50827943d61af34c8919 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f335f753634":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]},"rp_6f75747075745f6c696d69742e4f7574707574546f6b656e4c696d69746572":{"kind":"data","name":"rp_6f75747075745f6c696d69742e4f7574707574546f6b656e4c696d69746572","ctors":[{"name":"OutputTokenLimiter","fields":[{"name":"remaining","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}},{"name":"stopped","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_a848cb195b9218a810902449abf2dc148cf7c8a29b7f50827943d61af34c8919 = new Map([]);

const ml_host_value_schema_a04caa44f88bbe206ff76b6b1508238ee6d35e913cffa29065adf668ed9ed323 = {"schemaVersion":1,"types":{"rp_706f6f6c5f72657472792e5265747279427564676574":{"kind":"data","name":"rp_706f6f6c5f72657472792e5265747279427564676574","ctors":[{"name":"RetryBudget","fields":[{"name":"policy","type":{"kind":"data","name":"rp_706f6f6c5f72657472792e5265747279506f6c696379"}},{"name":"round","type":{"kind":"fixed","bits":32,"signed":false}},{"name":"per_round","type":{"kind":"fixed","bits":32,"signed":false}},{"name":"max_attempts","type":{"kind":"fixed","bits":32,"signed":false}}]}]},"rp_706f6f6c5f72657472792e5265747279506f6c696379":{"kind":"data","name":"rp_706f6f6c5f72657472792e5265747279506f6c696379","ctors":[{"name":"RetryPolicy","fields":[{"name":"rounds","type":{"kind":"fixed","bits":32,"signed":false}},{"name":"max_credentials","type":{"kind":"fixed","bits":32,"signed":false}},{"name":"max_interval","type":{"kind":"data","name":"rp_7374642e74696d652e4475726174696f6e"}}]}]},"rp_7374642e74696d652e4475726174696f6e":{"kind":"data","name":"rp_7374642e74696d652e4475726174696f6e","ctors":[{"name":"Duration","fields":[{"name":"secs","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"nanos","type":{"kind":"fixed","bits":32,"signed":false}}]}]}}};

const ml_host_value_refinements_a04caa44f88bbe206ff76b6b1508238ee6d35e913cffa29065adf668ed9ed323 = new Map([["rp_7374642e74696d652e4475726174696f6e", ml_validate_duration]]);

const ml_host_value_schema_cac9604dc9765a0af65b1c31155247bb6eae92864c8dcffc3eec87b70f8374b7 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_6163636f756e74732e526f7574696e67436f6e74657874":{"kind":"data","name":"rp_6163636f756e74732e526f7574696e67436f6e74657874","ctors":[{"name":"RoutingContext","fields":[{"name":"session_key","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"parent_session_key","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"pinned_account","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"model","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"exclude","type":{"kind":"array","element":{"kind":"string"}}}]}]}}};

const ml_host_value_refinements_cac9604dc9765a0af65b1c31155247bb6eae92864c8dcffc3eec87b70f8374b7 = new Map([]);

const ml_host_value_schema_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65":{"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65","ctors":[{"name":"StreamOutcome","fields":[{"name":"streamed","type":{"kind":"bool"}},{"name":"terminated","type":{"kind":"bool"}},{"name":"inspectable","type":{"kind":"bool"}},{"name":"detail","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"frames","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"bytes","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"duration_ms","type":{"kind":"fixed","bits":128,"signed":false}}]}]}}};

const ml_host_value_refinements_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb = new Map([]);

const ml_host_value_schema_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 = {"schemaVersion":1,"types":{"rp_7374642e74696d652e4475726174696f6e":{"kind":"data","name":"rp_7374642e74696d652e4475726174696f6e","ctors":[{"name":"Duration","fields":[{"name":"secs","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"nanos","type":{"kind":"fixed","bits":32,"signed":false}}]}]}}};

const ml_host_value_refinements_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 = new Map([["rp_7374642e74696d652e4475726174696f6e", ml_validate_duration]]);

const ml_host_value_schema_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a = {"schemaVersion":1,"types":{"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365":{"kind":"data","name":"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365","ctors":[{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]}]}}};

const ml_host_value_refinements_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a = new Map([]);

const ml_host_value_schema_61dfd53674d645afd1c8de731523520c1e33ba3584a42b1556b50d4958ecf679 = {"schemaVersion":1,"types":{"rp_73746f705f73657175656e6365732e53746f7053657175656e636546696c746572":{"kind":"data","name":"rp_73746f705f73657175656e6365732e53746f7053657175656e636546696c746572","ctors":[{"name":"StopSequenceFilter","fields":[{"name":"sequences","type":{"kind":"array","element":{"kind":"string"}}},{"name":"pending","type":{"kind":"string"}},{"name":"stopped","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_61dfd53674d645afd1c8de731523520c1e33ba3584a42b1556b50d4958ecf679 = new Map([]);

const ml_host_value_schema_c4b47d79bd7fb30e5f44f88a340c8dcd3e2121c7c72685fb6db4332ec3f01ff5 = {"schemaVersion":1,"types":{"rp_73747265616d5f7465726d696e6174696f6e2e5465726d696e616c4576656e744465746563746f72":{"kind":"data","name":"rp_73747265616d5f7465726d696e6174696f6e2e5465726d696e616c4576656e744465746563746f72","ctors":[{"name":"TerminalEventDetector","fields":[{"name":"carry","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}},{"name":"seen","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_c4b47d79bd7fb30e5f44f88a340c8dcd3e2121c7c72685fb6db4332ec3f01ff5 = new Map([]);

const ml_host_value_schema_1c499caf4dae6d3d3340ae46e10ab5a1268e3757bf0a7c6ea7cebbc94f754bbe = {"schemaVersion":1,"types":{"rp_7468696e6b696e672e5468696e6b696e6750726f746f636f6c":{"kind":"data","name":"rp_7468696e6b696e672e5468696e6b696e6750726f746f636f6c","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAIChat","fields":[]},{"name":"OpenAIResponses","fields":[]},{"name":"Gemini","fields":[]},{"name":"Vertex","fields":[]},{"name":"Codex","fields":[]},{"name":"Qwen","fields":[]},{"name":"Interactions","fields":[]},{"name":"Antigravity","fields":[]},{"name":"Kimi","fields":[]},{"name":"Xai","fields":[]}]}}};

const ml_host_value_refinements_1c499caf4dae6d3d3340ae46e10ab5a1268e3757bf0a7c6ea7cebbc94f754bbe = new Map([]);

const ml_host_value_schema_a113c5f551c9c7f8f771017692d47d22e0050629dd38a981de94775ced7086fe = {"schemaVersion":1,"types":{"rp_757073747265616d5f67756172642e4e6574776f726b506f6c696379":{"kind":"data","name":"rp_757073747265616d5f67756172642e4e6574776f726b506f6c696379","ctors":[{"name":"NetworkPolicy","fields":[{"name":"loopback","type":{"kind":"bool"}},{"name":"private","type":{"kind":"bool"}},{"name":"link_local","type":{"kind":"bool"}},{"name":"all","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_a113c5f551c9c7f8f771017692d47d22e0050629dd38a981de94775ced7086fe = new Map([]);

const ml_host_value_schema_88474d9f92da6bba9f1da984f384993a39d4d4df82ae06af296d002e910f6475 = {"schemaVersion":1,"types":{"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c7572654b696e64":{"kind":"data","name":"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c7572654b696e64","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unverified","fields":[]}]}}};

const ml_host_value_refinements_88474d9f92da6bba9f1da984f384993a39d4d4df82ae06af296d002e910f6475 = new Map([]);

const ml_host_value_schema_60c64955d2621ea17dc08bfce2195e5d8ac9dc6c374f0ffba7fa736e430ce1c1 = {"schemaVersion":1,"types":{"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c757265":{"kind":"data","name":"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c757265","ctors":[{"name":"ZaiProbeFailure","fields":[{"name":"kind","type":{"kind":"data","name":"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c7572654b696e64"}},{"name":"message","type":{"kind":"string"}}]}]},"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c7572654b696e64":{"kind":"data","name":"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c7572654b696e64","ctors":[{"name":"CredentialRejected","fields":[]},{"name":"RateLimited","fields":[]},{"name":"Unverified","fields":[]}]}}};

const ml_host_value_refinements_60c64955d2621ea17dc08bfce2195e5d8ac9dc6c374f0ffba7fa736e430ce1c1 = new Map([]);

function ml_validate_duration(value) { ml_host_duration_as_secs(value); return true; }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

const ml_host_rust_fixed_saturating_add_u64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_fixed_saturating_add;

const ml_host_rust_vec_first_named_73657264655f6a736f6e_56616c7565 = ml_create_vector_runtime(values => ml_validate_rust_value(values, {"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 })).rust_vec_first;

const ml_host_rust_fixed_saturating_mul_u64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_fixed_saturating_mul;

const ml_host_rust_integer_parse_u64 = ml_create_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_integer_parse;

function rp_6163636f756e745f687474702e44454641554c545f4143434f554e545f504f4f4c5f49444c455f54494d454f55545f53454353() {
  return 90n;
}

function rp_6163636f756e745f687474702e44454641554c545f4143434f554e545f434f4e4e454354494f4e5f4d41585f4147455f53454353() {
  return 300n;
}

function rp_6163636f756e745f687474702e50524f58595f534348454d4553() {
  return Object.freeze(["http", "https", "socks5", "socks5h"]);
}

function rp_6163636f756e745f6c696d6974732e554e49464945445f505245464958() {
  return "anthropic-ratelimit-unified-";
}

function rp_6163636f756e745f6c696d6974732e4d41585f56454e444f525f434f4f4c444f574e() {
  return ml_host_std_time_duration_from_secs(ml_fixed((ml_fixed((ml_fixed((8n * 24n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_6163636f756e745f6c696d6974732e53544154455f46494c45() {
  return "account-limits.json";
}

function rp_6163636f756e74732e6d6c5f696d706c5f3633373236313734363532653631363336333666373536653734373332653433373236353634363536653734363936313663353337343631373436355f36633631363236353663(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6163636f756e74732e43726564656e7469616c5374617465"}, ml_host_value_schema_3bbb892a07e36f83788445e9468b051c145f45b5261c58b6e4334c1a69a531eb, { refinements: ml_host_value_refinements_3bbb892a07e36f83788445e9468b051c145f45b5261c58b6e4334c1a69a531eb });
  switch (router_self.$) {
    case "Usable": {
      return "ok";
    }
    case "Refreshable": {
      return "refreshable";
    }
    case "Rejected": {
      return "rejected";
    }
    case "Expired": {
      return "expired";
    }
    case "Unusable": {
      const ml_f1 = router_self.field0;
      return "missing";
    }
    default: {
      return ml_router_unexpected(router_self);
    }
  }
}

function rp_6163636f756e74735f636c692e44454641554c545f50415553455f524541534f4e() {
  return "paused by an operator";
}

function rp_6163636f756e74735f636c692e4c4f43414c5f4e4f5445() {
  return "note: recorded in this machine's data directory; a router started from it applies the change at startup. Pass --server <URL> to change a running router.";
}

function rp_61637469766974797075622e41435449564954595f4a534f4e() {
  return "application/activity+json";
}

function rp_61646d696e2e41444d494e5f544f4b454e5f505245464958() {
  return "la_admin_";
}

function rp_61646d696e2e434c41494d5f46494c455f4e414d45() {
  return "admin-claim.json";
}

function rp_61646d696e2e434c41494d5f544f4b454e5f4c4142454c() {
  return "first-visitor-admin";
}

function rp_61646d696e5f7265636f766572792e5245434f56455245445f41444d494e5f4c4142454c() {
  return "recovered-admin";
}

function rp_616e7468726f7069635f6272696467652e44454641554c545f4d41585f544f4b454e53() {
  return 4096n;
}

function rp_616e7468726f7069635f73747265616d2e6d61705f73746f705f726561736f6e(finish_reason) {
  if (!(typeof finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if ((finish_reason === "length")) {
    return "max_tokens";
  } else {
    if ((finish_reason === "max_tokens")) {
      return "max_tokens";
    } else {
      if ((finish_reason === "max_output_tokens")) {
        return "max_tokens";
      } else {
        if ((finish_reason === "tool_calls")) {
          return "tool_use";
        } else {
          if ((finish_reason === "function_call")) {
            return "tool_use";
          } else {
            if ((finish_reason === "tool_use")) {
              return "tool_use";
            } else {
              return "end_turn";
            }
          }
        }
      }
    }
  }
}

function rp_616e7468726f7069635f73747265616d2e726573706f6e73655f636f6e74656e745f6b6579(event) {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return Object.freeze({ $: 'Tuple', field0: ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "output_index"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_2_0); }, "and_then"), 0n, true), field1: ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "content_index"), (ml_host_callback_5_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_5_0); }, "and_then"), 0n, true) });
}

function rp_6170695f6572726f722e6f70656e61695f6572726f725f74797065(status) {
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if ((status === 400n)) {
    return "invalid_request_error";
  } else {
    if ((status === 404n)) {
      return "invalid_request_error";
    } else {
      if ((status === 422n)) {
        return "invalid_request_error";
      } else {
        if ((status === 401n)) {
          return "authentication_error";
        } else {
          if ((status === 403n)) {
            return "permission_error";
          } else {
            if ((status === 429n)) {
              return "rate_limit_error";
            } else {
              return "api_error";
            }
          }
        }
      }
    }
  }
}

function rp_6170695f6572726f722e6f70656e61695f6572726f725f636f6465(status) {
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if ((status === 401n)) {
    return Object.freeze({ $: 'Some', field0: "invalid_api_key" });
  } else {
    if ((status === 403n)) {
      return Object.freeze({ $: 'Some', field0: "permission_denied" });
    } else {
      if ((status === 404n)) {
        return Object.freeze({ $: 'Some', field0: "model_not_found" });
      } else {
        if ((status === 429n)) {
          return Object.freeze({ $: 'Some', field0: "rate_limit_exceeded" });
        } else {
          return Object.freeze({ $: 'None' });
        }
      }
    }
  }
}

function rp_61756469742e737572666163655f6e616d65(surface) {
  ml_validate_rust_value(surface, {"kind":"data","name":"rp_6d6574726963732e53757266616365"}, ml_host_value_schema_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419, { refinements: ml_host_value_refinements_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 });
  switch (surface.$) {
    case "Anthropic": {
      return "anthropic";
    }
    case "OpenAIChat": {
      return "openai_chat";
    }
    case "OpenAIResponses": {
      return "openai_responses";
    }
    default: {
      return ml_router_unexpected(surface);
    }
  }
}

function rp_617574682e434f4445585f434c49454e545f4944() {
  return "app_EMoamEEZ73f0CkXaXp7hrann";
}

function rp_617574682e434f4445585f495353554552() {
  return "https://auth.openai.com";
}

function rp_617574682e434f4445585f43414c4c4241434b5f50415448() {
  return "/auth/callback";
}

function rp_617574682e434f4445585f4445564943455f43414c4c4241434b5f50415448() {
  return "/deviceauth/callback";
}

function rp_617574685f72656d6f74652e524551554553545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(30n);
}

function rp_617574685f72656d6f74652e7374617475735f6f66(view) {
  ml_validate_rust_value(view, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(view, "status"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_2_0); }, "and_then"), "unknown", true);
}

function rp_6272696467655f636f6e74726f6c732e434841545f4649454c4453() {
  return Object.freeze(["model", "messages", "max_tokens", "max_completion_tokens", "temperature", "top_p", "frequency_penalty", "presence_penalty", "logit_bias", "seed", "stream", "stream_options", "stop", "tools", "tool_choice", "reasoning_effort", "reasoning", "response_format", "parallel_tool_calls", "n", "modalities", "audio", "logprobs", "top_logprobs", "safety_identifier", "service_tier", "prompt_cache_key", "prompt_cache_options", "prompt_cache_retention", "moderation", "prediction", "user"]);
}

function rp_6272696467655f636f6e74726f6c732e524553504f4e53455f4649454c4453() {
  return Object.freeze(["model", "input", "instructions", "max_output_tokens", "temperature", "top_p", "stream", "tools", "tool_choice", "reasoning", "text", "parallel_tool_calls", "background", "max_tool_calls", "truncation", "store", "stream_options", "safety_identifier", "previous_response_id", "conversation", "service_tier", "prompt_cache_key", "prompt_cache_options", "prompt_cache_retention", "moderation", "metadata", "include", "prompt", "user", "context_management", "top_logprobs"]);
}

function rp_6272696467655f726573706f6e73652e73746f705f73656d616e74696373(reason) {
  ml_validate_rust_value(reason, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  const ml_s1 = ml_router_unwrap(reason, "end_turn", true);
  if ((ml_s1 === "end_turn")) {
    return rp_6272696467655f726573706f6e73652e636f6d706c657465("stop");
  } else {
    if ((ml_s1 === "stop_sequence")) {
      return rp_6272696467655f726573706f6e73652e636f6d706c657465("stop");
    } else {
      if ((ml_s1 === "tool_use")) {
        return rp_6272696467655f726573706f6e73652e636f6d706c657465("tool_calls");
      } else {
        if ((ml_s1 === "refusal")) {
          return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("content_filter", "content_filter", true);
        } else {
          if ((ml_s1 === "max_tokens")) {
            return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
          } else {
            if ((ml_s1 === "pause_turn")) {
              return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
            } else {
              if ((ml_s1 === "model_context_window_exceeded")) {
                return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
              } else {
                return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
              }
            }
          }
        }
      }
    }
  }
}

function rp_6272696467655f726573706f6e73652e636f6d706c657465(chat_finish_reason) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "completed";
  const ml_record3 = Object.freeze({ $: 'None' });
  const ml_record4 = false;
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 });
}

function rp_6272696467655f726573706f6e73652e696e636f6d706c657465(chat_finish_reason, reason, refusal) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof refusal === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "incomplete";
  const ml_record3 = Object.freeze({ $: 'Some', field0: reason });
  const ml_record4 = refusal;
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 });
}

function rp_6272696467655f726573706f6e73652e6d6c5f696d706c5f3633373236313734363532653632373236393634363736353566373236353733373036663665373336353265343136653734363837323666373036393633353537333631363736355f37343666373436313663356636393665373037353734(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6272696467655f726573706f6e73652e416e7468726f7069635573616765"}, ml_host_value_schema_4faa4c889e5db4507ae4aa0291f0bac64b58421ba39bcf84a393f774aaa4d426, { refinements: ml_host_value_refinements_4faa4c889e5db4507ae4aa0291f0bac64b58421ba39bcf84a393f774aaa4d426 });
  return ml_host_rust_fixed_saturating_add_u64(ml_host_rust_fixed_saturating_add_u64((router_self).input_tokens, (router_self).cache_creation_input_tokens), (router_self).cache_read_input_tokens);
}

function rp_6272696467655f73656c656374696f6e2e4d4f44454c5f53454c454354494f4e5f5245515549524544() {
  return "model_selection_required";
}

function rp_636861745f61646d696e2e44454641554c545f5345435245545f54544c5f53454353() {
  return 120n;
}

function rp_636861745f61646d696e2e44454641554c545f524154455f4c494d49545f5045525f4d494e555445() {
  return 5n;
}

function rp_636861745f61646d696e2e524154455f4c494d49545f57494e444f57() {
  return ml_host_std_time_duration_from_secs(60n);
}

function rp_636861745f61646d696e2e53455353494f4e5f49444c455f54544c() {
  return ml_host_std_time_duration_from_secs(3600n);
}

function rp_636861745f61646d696e2e4d41585f53455353494f4e53() {
  return 512n;
}

function rp_636861745f61646d696e2e414c52454144595f434c41494d4544() {
  return "Administration of this router is already claimed (here, through the web UI, or by deployment configuration). Send `/auth <admin token>` with an admin credential.";
}

function rp_636861745f61646d696e2e524154455f4c494d49544544() {
  return "Too many attempts. Wait a minute and try again.";
}

function rp_636861745f61646d696e2e48454c50() {
  return "Commands:\n/status — credential state, accounts and usage\n/tokens — list issued tokens (ids, labels and limits, never values)\n/issue [label] [ttl_hours] [max_requests] [key=value …] — issue a token;\n    options: label, ttl_hours, max_requests, max_tokens,\n    rate_limit_per_minute, account\n/show <id> — every constraint, counter and state for one token\n/rotate-token <id> [key=value …] — reissue a token, keeping its limits\n/revoke <id> — revoke a token\n/rotate — replace the admin credential\n/auth <token> — sign in with an admin credential\n/logout — forget the credential bound to this chat";
}

function rp_636861745f636f6d6d616e64732e44454641554c545f49535355455f54544c5f484f555253() {
  return 24n;
}

function rp_636861745f636f6d6d616e64732e4c4953545f4c494d4954() {
  return 30n;
}

function rp_636861745f636f6d6d616e64732e49535355455f4b455953() {
  return Object.freeze([Object.freeze({ $: 'Tuple', field0: "label", field1: Object.freeze(["label", "name"]) }), Object.freeze({ $: 'Tuple', field0: "ttl_hours", field1: Object.freeze(["ttl_hours", "ttl"]) }), Object.freeze({ $: 'Tuple', field0: "max_requests", field1: Object.freeze(["max_requests", "requests"]) }), Object.freeze({ $: 'Tuple', field0: "max_tokens", field1: Object.freeze(["max_tokens", "tokens"]) }), Object.freeze({ $: 'Tuple', field0: "rate_limit_per_minute", field1: Object.freeze(["rate_limit_per_minute", "rpm", "rate"]) }), Object.freeze({ $: 'Tuple', field0: "account", field1: Object.freeze(["account", "pin"]) })]);
}

function rp_636861745f636f6d6d616e64732e7965735f6e6f(value) {
  if (!(typeof value === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (value) {
    return "yes";
  } else {
    return "no";
  }
}

function rp_636c617564655f617574682e434c415544455f415554484f52495a455f55524c() {
  return "https://claude.com/cai/oauth/authorize";
}

function rp_636c617564655f617574682e434c415544455f52454449524543545f555249() {
  return "https://platform.claude.com/oauth/code/callback";
}

function rp_636c617564655f617574682e434c415544455f53434f504553() {
  return "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";
}

function rp_636c617564655f617574682e434c415544455f494e464552454e43455f53434f5045() {
  return "user:inference";
}

function rp_636c617564655f617574682e50454e44494e475f4c4f47494e5f46494c45() {
  return ".link-assistant-router-claude-login.json";
}

function rp_636c617564655f6964656e746974792e434c415544455f434f44455f53595354454d5f50524f4d5054() {
  return "You are Claude Code, Anthropic's official CLI for Claude.";
}

function rp_636c617564655f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e() {
  return "2.1.265";
}

function rp_636c617564655f6964656e746974792e69735f6f617574685f63726564656e7469616c(token) {
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  return token.startsWith("sk-ant-oat");
}

function rp_636c617564655f6964656e746974792e66697273745f626c6f636b5f69735f6964656e74697479(blocks) {
  ml_validate_rust_value(blocks, {"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"},"patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_host_option_bind(ml_host_option_bind(ml_host_option_bind(ml_host_rust_vec_first_named_73657264655f6a736f6e_56616c7565(blocks), (block) => { return ml_host_serde_json_value_get_string(block, "text"); }, "and_then"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then"), (text) => { return text.startsWith(rp_636c617564655f6964656e746974792e434c415544455f434f44455f53595354454d5f50524f4d5054()); }, "is_some_and");
}

function rp_636c69656e745f636f6d6d616e642e434c49454e545f544f4b454e5f454e56() {
  return "LINK_ASSISTANT_ROUTER_TOKEN";
}

function rp_636c69656e745f636f6d6d616e642e434c49454e545f544f4b454e5f454e565f414c494153() {
  return "LINK_ASSISTANT_TOKEN";
}

function rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f53455256494345535f4c494d49544154494f4e() {
  return "released Claude Code (checked through 2.1.283) has no supported split-auth mechanism: Router inference and /v1/models discovery use only the Router token, while the stored Claude.ai login remains untouched; Claude.ai connectors, Remote Control and /remote-control, /schedule, notification preferences, cloud sessions (--cloud, --environment, --teleport, and ultrareview), remote managed settings, and organization policy are unavailable in this Router-directed process";
}

function rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f534552564943455f524551554553545f4552524f52() {
  return "this Claude.ai operation cannot be routed because released Claude Code (checked through 2.1.283) has no supported split-auth mechanism; run it directly with Claude.ai authentication instead; no Router token was minted and no client was launched";
}

function rp_636c69656e745f6c6966656379636c652e6163746976652e50524f46494c455f5641524941424c4553() {
  return Object.freeze(["HOME", "USERPROFILE", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "APPDATA", "LOCALAPPDATA", "CODEX_HOME", "CLAUDE_CONFIG_DIR", "CURSOR_CONFIG_DIR", "GEMINI_CLI_HOME", "OPENCODE_CONFIG_DIR", "QWEN_HOME", "QWEN_RUNTIME_DIR"]);
}

function rp_636c69656e745f6c6966656379636c652e6163746976652e534554544c455f44454c4159() {
  return ml_host_std_time_duration_from_millis(20n);
}

function rp_636c69656e745f706f6c6963792e50524f584945445f434c49454e545f45564944454e43455f484541444552() {
  return "x-link-assistant-proxied-client";
}

function rp_636c69656e745f706f6c6963792e50524f584945445f434f4445585f45564944454e43455f56414c5545() {
  return "codex";
}

function rp_636c69656e74732e434f4445585f50524f5649444552() {
  return "link-assistant";
}

function rp_636c69656e74732e434f4445585f544f4b454e5f454e56() {
  return "LINK_ASSISTANT_TOKEN";
}

function rp_636c69656e74732e434c415544455f544f4b454e5f454e56() {
  return "ANTHROPIC_AUTH_TOKEN";
}

function rp_636c69656e74732e434c415544455f424153455f454e56() {
  return "ANTHROPIC_BASE_URL";
}

function rp_636c69656e74732e524f555445525f544f4b454e5f454e56() {
  return "LINK_ASSISTANT_TOKEN";
}

function rp_636c69656e74732e47524f4b5f544f4b454e5f454e56() {
  return "GROK_API_KEY";
}

function rp_636c69656e74732e47524f4b5f424153455f454e56() {
  return "GROK_BASE_URL";
}

function rp_636c69656e74732e524f555445525f50524f5649444552() {
  return "link-assistant";
}

function rp_636c69656e74732e4f574e4552534849505f4d41524b4552() {
  return ".link-assistant-router-client.json";
}

function rp_636c69656e74732e4f50454e41495f4d4f44454c5f4f574e4552() {
  return "openai";
}

function rp_636c69656e74732e414e5448524f5049435f4d4f44454c5f4f574e4552() {
  return "anthropic";
}

function rp_636c69656e74732e474f4f474c455f4d4f44454c5f4f574e4552() {
  return "google";
}

function rp_636c69656e74732e5157454e5f4d4f44454c5f4f574e4552() {
  return "qwen";
}

function rp_636c69656e74732e5a41495f4d4f44454c5f4f574e4552() {
  return "z.ai";
}

function rp_636c69656e74732e44454641554c545f4f50454e41495f524541534f4e494e475f4546464f5254() {
  return "xhigh";
}

function rp_636c69656e74732e44454641554c545f414e5448524f5049435f524541534f4e494e475f4546464f5254() {
  return "high";
}

function rp_636c69656e74732e636174616c6f672e46524553485f5a41495f5052454645525245445f4d4f44454c() {
  return "glm-5.3";
}

function rp_636c69656e74732e646f63746f722e444f43544f525f45564944454e43455f484541444552() {
  return "x-link-assistant-client-check";
}

function rp_636c69656e74732e646f63746f722e444f43544f525f45564944454e43455f56414c5545() {
  return "reachability";
}

function rp_636c69656e74732e646f63746f722e4d494e494d554d5f434c415544455f474154455741595f56455253494f4e() {
  return Object.freeze({ $: 'Tuple', field0: 2n, field1: 1n, field2: 255n });
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f4259544553() {
  return 4096n;
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f434f554e54() {
  return 64n;
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f4845414445525f4259544553() {
  return 16384n;
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f484f535453() {
  return Object.freeze(["chatgpt.com", "chat.openai.com", "chatgpt-staging.com"]);
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e535542444f4d41494e5f5355464649584553() {
  return Object.freeze([".chatgpt.com", ".chatgpt-staging.com"]);
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f434f4f4b49455f4e414d4553() {
  return Object.freeze(["__cf_bm", "__cflb", "__cfruid", "__cfseq", "__cfwaitingroom", "_cfuvid", "cf_clearance", "cf_ob_info", "cf_use_ob"]);
}

function rp_636f6465785f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e() {
  return "0.154.0";
}

function rp_636f6465785f6964656e746974792e4f524947494e41544f52() {
  return "codex_cli_rs";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4241434b454e445f50415448() {
  return "/api/services/codex/backend-api";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e434f4e4e4543545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4845414c54485f484541444552() {
  return "x-link-assistant-router-codex-bridge";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4d41524b45525f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f555053545245414d5f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_UPSTREAM";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f53544154455f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_STATE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4e4f4e43455f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_NONCE";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4c495354454e5f454e56() {
  return "LINK_ASSISTANT_ROUTER_INTERNAL_CODEX_BRIDGE_LISTEN";
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e53544152545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(5n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e53544f505f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(3n);
}

function rp_636f6465785f6c6f6f706261636b5f6272696467652e504f4c4c5f494e54455256414c() {
  return ml_host_std_time_duration_from_millis(25n);
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e434f4e54494e554154494f4e5f505245464958() {
  return "la_rc_";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e46494c455f4e414d45() {
  return "codex-remote-control.lino";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e524f4f54() {
  return "/api/services/codex/backend-api/wham/remote/control/";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e534552564552() {
  return "/api/services/codex/backend-api/wham/remote/control/server";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e454e524f4c4c() {
  return "/api/services/codex/backend-api/wham/remote/control/server/enroll";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e52454652455348() {
  return "/api/services/codex/backend-api/wham/remote/control/server/refresh";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e524546524553485f555053545245414d() {
  return "/wham/remote/control/server/refresh";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e50414952() {
  return "/api/services/codex/backend-api/wham/remote/control/server/pair";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e504149525f535441545553() {
  return "/api/services/codex/backend-api/wham/remote/control/server/pair/status";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e454e5649524f4e4d454e5453() {
  return "/api/services/codex/backend-api/wham/remote/control/environments/";
}

function rp_636f6e6669675f64656661756c74732e64656661756c745f676f6e6b615f6d6f64656c() {
  return "";
}

function rp_636f6e6669675f64656661756c74732e64656661756c745f6f70656e61695f636f6d70617469626c655f626173655f75726c() {
  return "http://localhost:4000/v1";
}

function rp_636f6e766572736174696f6e5f7265636f72642e5245434f52445f454e56() {
  return "CONVERSATION_RECORD";
}

function rp_636f6e766572736174696f6e5f7265636f72642e5245504c41595f454e56() {
  return "CONVERSATION_REPLAY";
}

function rp_636f6e766572736174696f6e5f7265636f72642e5245504c41595f5455524e5f484541444552() {
  return "x-router-replay-turn";
}

function rp_636f6e766572736174696f6e5f7265636f72642e52454652414d45445f48454144455253() {
  return Object.freeze(["content-length", "transfer-encoding", "connection", "date"]);
}

function rp_636f6e766572736174696f6e5f7265636f72642e4d41585f5245434f524445445f424f4459() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e49474e4f5245445f48454144455253() {
  return Object.freeze(["authorization", "content-length", "host", "proxy-authorization", "user-agent", "x-api-key", "x-request-id", "date", "cookie"]);
}

function rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e434f4d50415245445f4649454c4453() {
  return Object.freeze(["method", "uri"]);
}

function rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e52454e44455245445f4c494d4954() {
  return 120n;
}

function rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e4845414445525f5048415345() {
  return "recording";
}

function rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e5455524e5f5048415345() {
  return "turn";
}

function rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e726561645f70726f76656e616e6365(record) {
  ml_validate_rust_value(record, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const ml_record1 = rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e737472696e675f6669656c64(record, "router_version");
  const ml_record2 = rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e737472696e675f6669656c64(record, "provider");
  return Object.freeze({ $: "Provenance", ["router_version"]: ml_record1, ["provider"]: ml_record2 });
}

function rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e737472696e675f6669656c64(record, name) {
  ml_validate_rust_value(record, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(record, name), (ml_host_callback_8_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_8_0); }, "and_then"), "unknown", true);
}

function rp_6372617465722e41435449564954595f4a534f4e() {
  return "application/activity+json";
}

function rp_6372617465722e4c494e4b45445f444154415f4a534f4e() {
  return "application/ld+json; profile=\"https://www.w3.org/ns/activitystreams\"";
}

function rp_6372617465722e44454641554c545f4d4f44454c() {
  return "crater-forgefed";
}

function rp_63726564656e7469616c5f616363657074616e63652e414343455054414e43455f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(20n);
}

function rp_63726564656e7469616c5f616363657074616e63652e53544147494e475f4449524543544f5259() {
  return "auth-import-candidates";
}

function rp_63726564656e7469616c5f616363657074616e63652e6d6c5f696d706c5f3633373236313734363532653633373236353634363536653734363936313663356636313633363336353730373436313665363336353265343136333633363537303734363136653633363534363631363936633735373236355f3662363936653634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63654661696c757265"}, ml_host_value_schema_0099380dfa1b94ae9397ac80bfbd3dbaf27ebbc7d676499c85829e92d78ff5dd, { refinements: ml_host_value_refinements_0099380dfa1b94ae9397ac80bfbd3dbaf27ebbc7d676499c85829e92d78ff5dd });
  return (router_self).kind;
}

function rp_63726564656e7469616c5f616363657074616e63652e6d6c5f696d706c5f3633373236313734363532653633373236353634363536653734363936313663356636313633363336353730373436313665363336353265343136333633363537303734363136653633363534363631363936633735373236355f37303638363137333635(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_63726564656e7469616c5f616363657074616e63652e416363657074616e63654661696c757265"}, ml_host_value_schema_0099380dfa1b94ae9397ac80bfbd3dbaf27ebbc7d676499c85829e92d78ff5dd, { refinements: ml_host_value_refinements_0099380dfa1b94ae9397ac80bfbd3dbaf27ebbc7d676499c85829e92d78ff5dd });
  return (router_self).phase;
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f4449524543544f5259() {
  return "refresh-recovery";
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e5052494d4152595f4143434f554e54() {
  return "primary";
}

function rp_63726564656e7469616c5f7265636f766572795f73746f72652e43524544454e5449414c5f4c4f434b5f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(5n);
}

function rp_63726564656e7469616c5f736f757263652e524f555445525f4d455441444154415f4b4559() {
  return "_link_assistant_router";
}

function rp_63726564656e7469616c5f736f757263652e43524544454e5449414c5f534f555243455f4b4559() {
  return "credential_source";
}

function rp_63726564656e7469616c5f736f757263652e524546524553485f4f574e45525f4b4559() {
  return "refresh_owner";
}

function rp_63726564656e7469616c5f736f757263652e45585445524e414c5f524546524553485f4f574e4552() {
  return "external";
}

function rp_63726564656e7469616c5f73746f72652e4c4f434b5f535546464958() {
  return ".router-refresh.lock";
}

function rp_6465706c6f792e434f4e5441494e4552() {
  return "router-deploy";
}

function rp_6465706c6f792e52454c4159() {
  return "router-deploy-relay";
}

function rp_6465706c6f792e4e4554574f524b() {
  return "router-deploy-network";
}

function rp_6465706c6f792e4241434b454e445f505245464958() {
  return "router-deploy-backend-";
}

function rp_6465706c6f792e4c4142454c5f4b4559() {
  return "com.link-assistant.router.deploy";
}

function rp_6465706c6f792e4c4142454c() {
  return "com.link-assistant.router.deploy=1";
}

function rp_6465706c6f792e44454641554c545f504f5254() {
  return 8080n;
}

function rp_6465706c6f792e4845414c54485f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(60n);
}

function rp_6465706c6f792e4445504c4f595f544f4b454e5f4c4142454c() {
  return "deploy";
}

function rp_6465706c6f795f636f6e6669672e52455345525645445f454e56() {
  return Object.freeze(["TOKEN_SECRET", "DATA_DIR", "STORAGE_POLICY", "HOME", "PATH", "USER", "SHELL", "PWD", "IFS", "CLAUDE_CODE_HOME", "CLAUDE_CONFIG_DIR", "LISTENERS", "ROUTER_HOST", "ROUTER_PORT", "NODE_EXTRA_CA_CERTS"]);
}

function rp_6465706c6f795f636f6e6669672e52455345525645445f454e565f5052454649584553() {
  return Object.freeze(["ROUTER_DEPLOY_", "TLS_", "VERIFY_", "PRESERVATION_"]);
}

function rp_6465706c6f795f636f6e6669672e56455249464941424c455f434c49454e5453() {
  return Object.freeze(["claude", "codex", "qwen-code", "gemini", "opencode"]);
}

function rp_6465706c6f795f72656c61792e53544154455f454e56() {
  return "ROUTER_DEPLOY_RELAY_STATE";
}

function rp_6465706c6f795f72656c61792e4c495354454e4552535f454e56() {
  return "ROUTER_DEPLOY_RELAY_LISTENERS";
}

function rp_6465706c6f795f736565642e4d455441444154415f4b4559() {
  return "_link_assistant_router";
}

function rp_6465706c6f795f736565642e48414e444f5645525f4b4559() {
  return "handed_over";
}

function rp_646f63746f722e6c61746573745f76657273696f6e2e52454c454153455f415049() {
  return "https://api.github.com/repos/link-assistant/router/releases/latest";
}

function rp_64757261626c655f66696c652e524f4c4c4241434b5f535546464958() {
  return ".router-rollback";
}

function rp_64757261626c655f66696c652e434f4d4d49545f535546464958() {
  return ".router-commit";
}

function rp_64757261626c655f66696c652e4c4f434b5f504f4c4c5f494e54455256414c() {
  return ml_host_std_time_duration_from_millis(20n);
}

function rp_656d657267656e63795f617574682e464c4147() {
  return "--emergency-accept-any-token";
}

function rp_656d657267656e63795f617574682e454e56() {
  return "EMERGENCY_ACCEPT_ANY_TOKEN";
}

function rp_656d657267656e63795f617574682e414c4c4f575f4e4f4e5f4c4f4f504241434b5f454e56() {
  return "EMERGENCY_ALLOW_NON_LOOPBACK";
}

function rp_656d657267656e63795f617574682e4455524154494f4e5f454e56() {
  return "EMERGENCY_DURATION_MINUTES";
}

function rp_656d657267656e63795f617574682e5355424a4543545f505245464958() {
  return "emergency-bypass-";
}

function rp_656d657267656e63795f617574682e4c4142454c() {
  return "emergency-bypass";
}

function rp_656d657267656e63795f617574682e4845414c54485f484541444552() {
  return "x-link-assistant-emergency-auth";
}

function rp_656e636f6465645f726571756573745f626f64792e4d41585f4445434f4d5052455353494f4e5f524154494f() {
  return 200n;
}

function rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f4348554e4b5f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_656e636f6465645f726571756573745f626f64792e4d41585f504152414c4c454c5f5a5354445f4445434f444553() {
  return 4n;
}

function rp_656e747279706f696e742e535441434b5f4259544553() {
  return ml_fixed((ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6572726f725f6c6f672e44454641554c545f4d41585f4259544553() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6572726f725f6c6f672e4d41585f424f44595f4259544553() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6572726f725f6c6f672e4d41585f444f43554d454e545f4259544553() {
  return ml_fixed((ml_fixed((8n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

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

function rp_67656d696e692e726573706f6e7365732e6d6c5f696d706c5f363337323631373436353265363736353664363936653639326537323635373337303666366537333635373332653436363936653639373336385f36363732366636643566363736353664363936653639(reason) {
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  if ((reason === "STOP")) {
    return Object.freeze({ $: 'Completed' });
  } else {
    if ((reason === "MAX_TOKENS")) {
      return Object.freeze({ $: 'MaxOutputTokens' });
    } else {
      return Object.freeze({ $: 'ContentFilter' });
    }
  }
}

function rp_67656d696e695f6272696467652e4d4f44454c5f524f4c45() {
  return "model";
}

function rp_67656d696e695f6272696467652e6d61705f66696e6973685f726561736f6e(openai) {
  if (!(typeof openai === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(openai))) throw new TypeError('argument outside supported Rust value domain');
  if ((openai === "length")) {
    return "MAX_TOKENS";
  } else {
    if ((openai === "content_filter")) {
      return "SAFETY";
    } else {
      return "STOP";
    }
  }
}

function rp_6769745f70726f78792e5a45524f5f4f4944() {
  return "0000000000000000000000000000000000000000";
}

function rp_6769745f70726f78792e73636f70655f61646d697473(allowed_repositories, repository) {
  if (!ml_router_array(allowed_repositories, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof repository === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(repository))) throw new TypeError('argument outside supported Rust value domain');
  return ((allowed_repositories.length === 0) || ml_router_any(ml_router_iter(allowed_repositories), (allowed) => { return ((allowed).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)) === (repository).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32))); }));
}

function rp_6769745f70726f78792e63616e6f6e6963616c5f6769745f70617468(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_unwrap(ml_router_strip(path, "/api/services/github", false), path, true);
}

function rp_6769745f70726f78792e6d6c5f696d706c5f36333732363137343635326536373639373435663730373236663738373932653532363536363535373036343631373436355f363937333566363436353663363537343635(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6769745f70726f78792e526566557064617465"}, ml_host_value_schema_8174777fda70e9a8327ecb57b516ca791202637c71f3c24e9fab5964be02934c, { refinements: ml_host_value_refinements_8174777fda70e9a8327ecb57b516ca791202637c71f3c24e9fab5964be02934c });
  return ((router_self).new === rp_6769745f70726f78792e5a45524f5f4f4944());
}

function rp_6769745f70726f78792e6d6c5f696d706c5f36333732363137343635326536373639373435663730373236663738373932653532363536363535373036343631373436355f363937333566363337323635363137343635(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6769745f70726f78792e526566557064617465"}, ml_host_value_schema_8174777fda70e9a8327ecb57b516ca791202637c71f3c24e9fab5964be02934c, { refinements: ml_host_value_refinements_8174777fda70e9a8327ecb57b516ca791202637c71f3c24e9fab5964be02934c });
  return ((router_self).old === rp_6769745f70726f78792e5a45524f5f4f4944());
}

function rp_6769746875625f70726f78792e504f4c4943595f484541444552() {
  return "x-link-assistant-policy";
}

function rp_676f6e6b612e4d495353494e475f4150495f4b45595f4d455353414745() {
  return "Gonka broker mode requires GONKA_API_KEY";
}

function rp_676f6e6b612e434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_676f6e6b612e434154414c4f475f524551554553545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_676f6e6b612e4641494c45445f524546524553485f5245545259() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_676f6e6b612e4d41585f434154414c4f475f4259544553() {
  return ml_fixed((ml_fixed((4n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_676f6e6b612e4d41585f5353455f43415252595f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6c6566696e652e424153455f55524c() {
  return "https://lefine.pro/v1";
}

function rp_6c6566696e652e4d41585f434154414c4f475f424f4459() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6c6566696e652e756e617661696c61626c65(message) {
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  return rp_6c6566696e652e6d6c5f696d706c5f3633373236313734363532653663363536363639366536353265343336313734363136633666363734363631363936633735373236355f366536353737(Object.freeze({ $: 'Unavailable' }), message);
}

function rp_6c6566696e652e6d6c5f696d706c5f3633373236313734363532653663363536363639366536353265343336313734363136633666363734363631363936633735373236355f366536353737(kind, message) {
  ml_validate_rust_value(kind, {"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c7572654b696e64"}, ml_host_value_schema_571631ada2bf76346eaf7948abd0ec3d28ff64858585f8e25f6db0bdda197e61, { refinements: ml_host_value_refinements_571631ada2bf76346eaf7948abd0ec3d28ff64858585f8e25f6db0bdda197e61 });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = kind;
  const ml_record2 = message;
  return Object.freeze({ $: "CatalogFailure", ["kind"]: ml_record1, ["message"]: ml_record2 });
}

function rp_6c6566696e652e6d6c5f696d706c5f3633373236313734363532653663363536363639366536353265343336313734363136633666363734363631363936633735373236355f3662363936653634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6c6566696e652e436174616c6f674661696c757265"}, ml_host_value_schema_b1dcba45f86d22f78d36c4524144916181cc22ccbffdf6cbc00b60de8b22a990, { refinements: ml_host_value_refinements_b1dcba45f86d22f78d36c4524144916181cc22ccbffdf6cbc00b60de8b22a990 });
  return (router_self).kind;
}

function rp_6c696e6f5f6a736f6e2e41525241595f4d41524b4552() {
  return "#a";
}

function rp_6c696e6f5f6a736f6e2e4f424a4543545f4d41524b4552() {
  return "#o";
}

function rp_6c696e6f5f6a736f6e2e454d5054595f535452494e47() {
  return "%z";
}

function rp_6c6f675f616e616c797369732e726571756573745f61736b735f666f725f615f73747265616d(record) {
  ml_validate_rust_value(record, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_router_unwrap(ml_host_option_bind(ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(record, "body"), (body) => { return ml_host_serde_json_value_get_string(body, "json"); }, "and_then"), (body_2) => { return ml_host_serde_json_value_get_string(body_2, "stream"); }, "and_then"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_bool(ml_host_callback_2_0); }, "and_then"), false, true);
}

function rp_6c6f675f616e616c797369732e6d6c5f696d706c5f3633373236313734363532653663366636373566363136653631366337393733363937333265343537383633363836313665363736355f3633363137323732363936353634356636313665356636353732373236663732(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6c6f675f616e616c797369732e45786368616e6765"}, ml_host_value_schema_0b75292c9407c26cc4ad1e658e26529bf2b189e554b18341bf8ebebf59095918, { refinements: ml_host_value_refinements_0b75292c9407c26cc4ad1e658e26529bf2b189e554b18341bf8ebebf59095918 });
  return (router_self).stream_error;
}

function rp_6c6f675f616e616c797369732e6d6c5f696d706c5f3633373236313734363532653663366636373566363136653631366337393733363937333265343537383633363836313665363736355f3639373335663735366537363635373236393636363936313632366336353566373337343732363536313664(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6c6f675f616e616c797369732e45786368616e6765"}, ml_host_value_schema_0b75292c9407c26cc4ad1e658e26529bf2b189e554b18341bf8ebebf59095918, { refinements: ml_host_value_refinements_0b75292c9407c26cc4ad1e658e26529bf2b189e554b18341bf8ebebf59095918 });
  return ((router_self).streamed && !(router_self).inspectable);
}

function rp_6c6f675f616e616c797369732e6d6c5f696d706c5f3633373236313734363532653663366636373566363136653631366337393733363937333265343537383633363836313665363736355f363937333566373536653734363537323664363936653631373436353634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6c6f675f616e616c797369732e45786368616e6765"}, ml_host_value_schema_0b75292c9407c26cc4ad1e658e26529bf2b189e554b18341bf8ebebf59095918, { refinements: ml_host_value_refinements_0b75292c9407c26cc4ad1e658e26529bf2b189e554b18341bf8ebebf59095918 });
  return ((((router_self).streamed && (router_self).inspectable) && ((router_self).stream_outcome.$ === 'None')) && !(router_self).body_terminated);
}

function rp_6c6f675f6465636f64652e42524f544c495f425546464552() {
  return 4096n;
}

function rp_6c6f67696e2e535543434553535f4d41524b455253() {
  return Object.freeze(["Loginsuccessful", "successfullyauthenticated", "sk-ant-oat"]);
}

function rp_6c6f67696e2e4641494c5552455f4d41524b455253() {
  return Object.freeze(["OAutherror", "PressEntertoretry", "Invalidcode", "invalid_grant", "Authenticationfailed", "Loginfailed"]);
}

function rp_6c6f67696e2e5448454d455f5049434b45525f4d41524b4552() {
  return "Choosethetextstylethatlooksbestwithyourterminal";
}

function rp_6c6f67696e2e574f524b53504143455f54525553545f4d41524b4552() {
  return "Quicksafetycheck:Isthisaprojectyoucreated";
}

function rp_6c6f67696e2e4c4f47494e5f4d4554484f445f4d41524b4552() {
  return "Selectloginmethod:";
}

function rp_6c6f67696e2e52454144595f50524f4d50545f4d41524b4552() {
  return "Tipsforgettingstarted";
}

function rp_6c6f67696e5f7074792e5054595f434f4c53() {
  return 400n;
}

function rp_6c6f67696e5f7074792e5054595f524f5753() {
  return 60n;
}

function rp_6c6f67696e5f7074792e504f4c4c5f494e54455256414c() {
  return ml_host_std_time_duration_from_millis(50n);
}

function rp_6c6f67696e5f7074795f6261636b656e642e636f6e7461696e735f6d61726b6572(compact, markers) {
  if (!(typeof compact === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(compact))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(markers, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_any(ml_router_iter(markers), (marker) => { return compact.includes(marker); });
}

function rp_6c6f67696e5f75726c2e415554485f484f535453() {
  return Object.freeze(["claude.ai", "claude.com", "anthropic.com"]);
}

function rp_6c6f67696e5f75726c2e544f4b454e5f5052454649584553() {
  return Object.freeze(["sk-ant-oat", "sk-ant-"]);
}

function rp_6c6f67696e5f75726c2e5245444143544544() {
  return "[redacted]";
}

function rp_6c6f67696e5f75726c2e5345435245545f5052454649584553() {
  return Object.freeze(["sk-ant-", rp_746f6b656e2e544f4b454e5f505245464958(), rp_746f6b656e2e434f4445585f544f4b454e5f505245464958(), rp_61646d696e2e41444d494e5f544f4b454e5f505245464958()]);
}

function rp_6d616e616765645f7365727665722e434f4e4649475f4449524543544f5259() {
  return "link-assistant-router";
}

function rp_6d616e616765645f7365727665722e5345525645525f434f4e464947() {
  return "server.json";
}

function rp_6d616e616765645f7365727665722e4d414e414745445f5354415445() {
  return "managed-server.json";
}

function rp_6d616e616765645f7365727665722e4d414e414745445f4c4f434b() {
  return "managed-server.lock";
}

function rp_6d616e616765645f7365727665722e434f4e5441494e4552() {
  return "link-assistant-router-managed";
}

function rp_6d616e616765645f7365727665722e564f4c554d45() {
  return "link-assistant-router-managed-data";
}

function rp_6d616e616765645f7365727665722e494d414745() {
  return "ghcr.io/link-assistant/router:latest";
}

function rp_6d616e616765645f7365727665722e4d414e414745445f4c4142454c() {
  return "com.link-assistant.router.managed=1";
}

function rp_6d616e616765645f7365727665722e72756e5f6c656173652e4845415254424541545f494e54455256414c() {
  return ml_host_std_time_duration_from_secs(30n);
}

function rp_6d616e616765645f7365727665722e73656c656374696f6e2e54525553545f4449524543544f5259() {
  return "server-trust";
}

function rp_6d6f64656c5f636174616c6f672e434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_6d6f64656c5f636174616c6f672e46455443485f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_6d6f64656c5f636174616c6f672e5045525349535445445f434154414c4f475f46494c45() {
  return "model-catalogs.json";
}

function rp_6d6f64656c5f636174616c6f672e434154414c4f475f494e56414c49444154494f4e5f444952() {
  return "model-catalog-invalidations";
}

function rp_6d70702e6d6c5f696d706c5f36333732363137343635326536643730373032653464373037303433366636653636363936375f3639373335663633366636653636363936373735373236353634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6d70702e4d7070436f6e666967"}, ml_host_value_schema_df343cfed053ceb5b9ace01836a47f95adea466d00aa1bacd85207c46ae767a7, { refinements: ml_host_value_refinements_df343cfed053ceb5b9ace01836a47f95adea466d00aa1bacd85207c46ae767a7 });
  return ((((router_self).enabled && !(((router_self).amount).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '').length === 0)) && !(((router_self).currency).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '').length === 0)) && !(((router_self).recipient).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '').length === 0));
}

function rp_6e61746976655f736572766963652e434f4e4e4543545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_6f7065726174696f6e616c5f6c6f672e4d41585f4259544553() {
  return ml_fixed((ml_fixed((2n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6f7065726174696f6e616c5f6c6f672e4241434b555053() {
  return 4n;
}

function rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e() {
  return 4n;
}

function rp_6f75747075745f6c696d69742e6576656e745f636f6e7461696e735f617373697374616e745f636f6e74656e74(event) {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ((ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "type"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then"), (kind) => { return ((kind.includes("output_text.delta") || kind.includes("content_block_delta")) || kind.includes("function_call_arguments.delta")); }, "is_some_and") || ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "choices"), (ml_host_callback_1_0) => { return ml_host_serde_json_value_as_array(ml_host_callback_1_0); }, "and_then"), (choices) => { return !(choices.length === 0); }, "is_some_and")) || ml_host_option_bind(ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(event, "candidates"), () => { return ml_host_serde_json_value_pointer(event, "/response/candidates"); }, "or_else"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_array(ml_host_callback_2_0); }, "and_then"), (candidates) => { return !(candidates.length === 0); }, "is_some_and"));
}

function rp_6f75747075745f6c696d69742e6d6c5f696d706c5f36333732363137343635326536663735373437303735373435663663363936643639373432653466373537343730373537343534366636623635366534633639366436393734363537325f366536353737(limit) {
  ml_validate_rust_value(limit, {"kind":"data","name":"rp_526f757465724f7074696f6e5f335f753634"}, ml_host_value_schema_931c1b14e9c7f25ce67e65592bea8fe26d11385e3b4ef76d393ac3312e5c453a, { refinements: ml_host_value_refinements_931c1b14e9c7f25ce67e65592bea8fe26d11385e3b4ef76d393ac3312e5c453a });
  const ml_record1 = (() => {
    switch (limit.$) {
      case "None": {
        return Object.freeze({ $: 'None' });
      }
      case "Some": {
        const limit_2 = limit.field0;
        return Object.freeze({ $: 'Some', field0: ml_host_rust_fixed_saturating_mul_u64(limit_2, rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e()) });
      }
      default: {
        return ml_router_unexpected(limit);
      }
    }
  })();
  const ml_record2 = false;
  return Object.freeze({ $: "OutputTokenLimiter", ["remaining"]: ml_record1, ["stopped"]: ml_record2 });
}

function rp_6f75747075745f6c696d69742e6d6c5f696d706c5f36333732363137343635326536663735373437303735373435663663363936643639373432653466373537343730373537343534366636623635366534633639366436393734363537325f3635366536313632366336353634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6f75747075745f6c696d69742e4f7574707574546f6b656e4c696d69746572"}, ml_host_value_schema_a848cb195b9218a810902449abf2dc148cf7c8a29b7f50827943d61af34c8919, { refinements: ml_host_value_refinements_a848cb195b9218a810902449abf2dc148cf7c8a29b7f50827943d61af34c8919 });
  return ((router_self).remaining.$ === 'Some');
}

function rp_6f75747075745f6c696d69742e6d6c5f696d706c5f36333732363137343635326536663735373437303735373435663663363936643639373432653466373537343730373537343534366636623635366534633639366436393734363537325f3733373436663730373036353634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_6f75747075745f6c696d69742e4f7574707574546f6b656e4c696d69746572"}, ml_host_value_schema_a848cb195b9218a810902449abf2dc148cf7c8a29b7f50827943d61af34c8919, { refinements: ml_host_value_refinements_a848cb195b9218a810902449abf2dc148cf7c8a29b7f50827943d61af34c8919 });
  return (router_self).stopped;
}

function rp_706f6f6c5f6661696c6f7665722e44454641554c545f4d41585f415454454d505453() {
  return 3n;
}

function rp_706f6f6c5f6661696c6f7665722e44454641554c545f4255444745545f53454353() {
  return 30n;
}

function rp_706f6f6c5f6661696c6f7665722e4d41585f4255444745545f53454353() {
  return ml_fixed((ml_fixed((24n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_706f6f6c5f6661696c6f7665722e636c6173736966795f737461747573(status) {
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if ((status === 429n)) {
    return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'RateLimited' }) });
  } else {
    if ((status === 529n)) {
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Overloaded' }) });
    } else {
      if ((status === 500n)) {
        return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) });
      } else {
        if ((status === 502n)) {
          return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) });
        } else {
          if ((status === 503n)) {
            return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) });
          } else {
            if ((status === 504n)) {
              return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) });
            } else {
              if ((status === 401n)) {
                return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Unauthorized' }) });
              } else {
                return Object.freeze({ $: 'None' });
              }
            }
          }
        }
      }
    }
  }
}

function rp_706f6f6c5f726573706f6e73652e4d41585f4552524f525f4259544553() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_706f6f6c5f72657472792e6d6c5f696d706c5f36333732363137343635326537303666366636633566373236353734373237393265353236353734373237393432373536343637363537345f3732366637353665363435663636373536633663(router_self, context) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_706f6f6c5f72657472792e5265747279427564676574"}, ml_host_value_schema_a04caa44f88bbe206ff76b6b1508238ee6d35e913cffa29065adf668ed9ed323, { refinements: ml_host_value_refinements_a04caa44f88bbe206ff76b6b1508238ee6d35e913cffa29065adf668ed9ed323 });
  ml_validate_rust_value(context, {"kind":"data","name":"rp_6163636f756e74732e526f7574696e67436f6e74657874","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_cac9604dc9765a0af65b1c31155247bb6eae92864c8dcffc3eec87b70f8374b7, { refinements: ml_host_value_refinements_cac9604dc9765a0af65b1c31155247bb6eae92864c8dcffc3eec87b70f8374b7 });
  return (BigInt((context).exclude.length) >= (router_self).per_round);
}

function rp_706f6f6c5f72657472792e6d6c5f696d706c5f36333732363137343635326537303666366636633566373236353734373237393265353236353734373237393432373536343637363537345f37323666373536653634373335663735373336353634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_706f6f6c5f72657472792e5265747279427564676574"}, ml_host_value_schema_a04caa44f88bbe206ff76b6b1508238ee6d35e913cffa29065adf668ed9ed323, { refinements: ml_host_value_refinements_a04caa44f88bbe206ff76b6b1508238ee6d35e913cffa29065adf668ed9ed323 });
  return (router_self).round;
}

function rp_706f6f6c5f73747265616d5f6c696d6974732e4d41585f4556454e545f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_70726f76696465725f70726f78792e50524f56494445525f434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_70726f76696465725f70726f78792e50524f56494445525f4641494c45445f524546524553485f5245545259() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_70726f78792e4150495f505245464958() {
  return "/api/services/anthropic/";
}

function rp_70726f78792e52455155495245445f464f52574152445f48454144455253() {
  return Object.freeze(["anthropic-beta", "anthropic-version"]);
}

function rp_70726f78792e484f505f42595f484f505f48454144455253() {
  return Object.freeze(["host", "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
}

function rp_70726f78792e524553504f4e53455f43524544454e5449414c5f48454144455253() {
  return Object.freeze(["authorization", "proxy-authorization", "set-cookie", "set-cookie2", "x-api-key", "x-goog-api-key", "anthropic-auth-token"]);
}

function rp_70726f78792e41434345505445445f43524544454e5449414c5f4341525249455253() {
  return Object.freeze(["x-api-key", "x-goog-api-key"]);
}

function rp_70726f78792e43524544454e5449414c5f434152524945525f48494e54() {
  return "Missing client token. Present it as `Authorization: Bearer <token>`, `x-api-key: <token>` or `x-goog-api-key: <token>`. The `?key=` query parameter is deliberately not accepted, because a URL is recorded by proxies and server logs.";
}

function rp_70726f78792e757073747265616d5f686561646572732e44454641554c545f414e5448524f5049435f56455253494f4e() {
  return "2023-06-01";
}

function rp_70726f78792e757073747265616d5f686561646572732e4f415554485f424554415f464c4147() {
  return "oauth-2025-04-20";
}

function rp_70726f78792e757073747265616d5f686561646572732e494e47524553535f4e4554574f524b5f48454144455253() {
  return Object.freeze(["forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port", "x-forwarded-server", "x-original-forwarded-for", "x-real-ip", "x-client-ip", "x-cluster-client-ip", "cf-connecting-ip", "true-client-ip", "fastly-client-ip", "fly-client-ip", "x-envoy-external-address", "x-forwarded-client-cert", "x-azure-clientip", "x-appengine-user-ip", "cloudfront-viewer-address"]);
}

function rp_726566726573682e434c415544455f4f415554485f555345525f4147454e54() {
  return "anthropic-sdk-typescript/0.112.1 userOAuthProvider";
}

function rp_726566726573682e414e5448524f5049435f53444b5f56455253494f4e() {
  return "0.112.1";
}

function rp_726566726573682e47454d494e495f434c495f56455253494f4e() {
  return "0.59.0";
}

function rp_726566726573682e474f4f474c455f415554485f4c4942524152595f56455253494f4e() {
  return "10.9.0";
}

function rp_726566726573682e5157454e5f434f44455f56455253494f4e() {
  return "0.23.1";
}

function rp_726566726573682e47454d494e495f434c49454e545f49445f454e56() {
  return "GEMINI_OAUTH_CLIENT_ID";
}

function rp_726566726573682e47454d494e495f434c49454e545f5345435245545f454e56() {
  return "GEMINI_OAUTH_CLIENT_SECRET";
}

function rp_726566726573682e47454d494e495f434c49454e545f4944() {
  return "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";
}

function rp_726566726573682e47454d494e495f415554485f555345525f4147454e54() {
  return "google-api-nodejs-client/10.9.0";
}

function rp_726566726573682e47454d494e495f4150495f434c49454e54() {
  return "gl-node/22.14.0";
}

function rp_726566726573682e434c415544455f434c49454e545f4944() {
  return "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
}

function rp_726566726573682e434c415544455f544f4b454e5f55524c() {
  return "https://platform.claude.com/v1/oauth/token";
}

function rp_726566726573685f72656a656374696f6e732e52454a454354494f4e535f46494c455f4e414d45() {
  return "refresh-rejections.lino";
}

function rp_726571756573745f6c6f672e4c4f475f46494c45() {
  return "requests.lino";
}

function rp_726571756573745f6c6f672e4c45474143595f4c4f475f46494c45() {
  return "requests.jsonl";
}

function rp_726571756573745f6c6f672e5245444143544544() {
  return "[REDACTED]";
}

function rp_726571756573745f6c6f672e554e41555448454e54494341544544() {
  return "unauthenticated";
}

function rp_726571756573745f6c6f672e6d616e6167656d656e742e4d41585f4c4f4f4b55505f4259544553() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_726571756573745f6c6f672e726564616374696f6e2e42494e4152595f424f44595f4b4559() {
  return "base64";
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53545245414d5f454e445f4d41524b4552() {
  return "stream-end marker";
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e73747265616d5f77617272616e74735f615f7761726e696e67(outcome) {
  ml_validate_rust_value(outcome, {"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb, { refinements: ml_host_value_refinements_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb });
  return rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e6d6c5f696d706c5f36333732363137343635326537323635373137353635373337343566366336663637326537333734373236353631366435663666373537343633366636643635326535333734373236353631366434663735373436333666366436355f3639373335663634363536643666366537333734373236313632366337393566363337353734(outcome);
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e746578745f7465726d696e617465735f73747265616d(text) {
  if (!(typeof text === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(text))) throw new TypeError('argument outside supported Rust value domain');
  return (((text.includes("message_stop") || text.includes("[DONE]")) || text.includes("response.completed")) || text.includes("finishReason"));
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e6d6c5f696d706c5f36333732363137343635326537323635373137353635373337343566366336663637326537333734373236353631366435663666373537343633366636643635326535333734373236353631366434663735373436333666366436355f36393733356636333666366437303663363537343635(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65"}, ml_host_value_schema_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb, { refinements: ml_host_value_refinements_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb });
  if (!(router_self).streamed) {
    return ((router_self).detail.$ === 'None');
  } else {
  }
  if (!(router_self).inspectable) {
    return false;
  } else {
  }
  return ((router_self).terminated && ((router_self).detail.$ === 'None'));
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e6d6c5f696d706c5f36333732363137343635326537323635373137353635373337343566366336663637326537333734373236353631366435663666373537343633366636643635326535333734373236353631366434663735373436333666366436355f3639373335663634363536643666366537333734373236313632366337393566363337353734(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65"}, ml_host_value_schema_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb, { refinements: ml_host_value_refinements_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb });
  if (((router_self).detail.$ === 'Some')) {
    return true;
  } else {
  }
  return (((router_self).streamed && (router_self).inspectable) && !(router_self).terminated);
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e6d6c5f696d706c5f36333732363137343635326537323635373137353635373337343566366336663637326537333734373236353631366435663666373537343633366636643635326535333734373236353631366434663735373436333666366436355f36633631363236353663(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65"}, ml_host_value_schema_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb, { refinements: ml_host_value_refinements_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb });
  if (((router_self).detail.$ === 'Some')) {
    return "upstream_error";
  } else {
    if (!(router_self).streamed) {
      return "completed_not_streamed";
    } else {
      if ((router_self).terminated) {
        return "completed";
      } else {
        if ((router_self).inspectable) {
          return "ended_without_terminator";
        } else {
          return "encoded_not_verifiable";
        }
      }
    }
  }
}

function rp_726571756573745f726f7574696e672e4d41585f52455452595f4146544552() {
  return ml_host_std_time_duration_from_secs(ml_fixed((ml_fixed((24n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_726571756573745f726f7574696e672e626f756e6465645f72657472795f6166746572(duration) {
  ml_validate_rust_value(duration, {"kind":"data","name":"rp_7374642e74696d652e4475726174696f6e"}, ml_host_value_schema_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7, { refinements: ml_host_value_refinements_e7ee5cdad12a2c42655adc11b0c79869f6ca16ad6b7bb23285fe46220669f0f7 });
  return ml_host_std_time_duration_min(duration, rp_726571756573745f726f7574696e672e4d41585f52455452595f4146544552());
}

function rp_726573706f6e73655f616666696e6974792e46494c455f4e414d45() {
  return "response-affinities.lino";
}

function rp_726573706f6e73655f616666696e6974792e44454641554c545f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((ml_fixed((ml_fixed((30n * 24n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_726573706f6e7365735f776562736f636b65742e524553504f4e5345535f50415448() {
  return "/v1/responses";
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f4e414d45445f53545245414d53() {
  return 32n;
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f53545245414d5f49445f4348415253() {
  return 256n;
}

function rp_726573706f6e7365735f776562736f636b65742e4d41585f434f4e4e454354494f4e5f414745() {
  return ml_host_std_time_duration_from_secs(ml_fixed((60n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_726573706f6e7365735f776562736f636b65742e434f4e4e4543545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_726573706f6e7365735f776562736f636b65742e6e616d6573706163655f70617468(namespace) {
  ml_validate_rust_value(namespace, {"kind":"data","name":"rp_726573706f6e7365735f776562736f636b65742e4e616d657370616365"}, ml_host_value_schema_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a, { refinements: ml_host_value_refinements_2d77511a83b66f015d7a9a4166263edaba333dc1c8ae3027346dbf81989af38a });
  switch (namespace.$) {
    case "OpenAi": {
      return "/api/services/openai/v1/responses";
    }
    case "Codex": {
      return "/api/services/codex/v1/responses";
    }
    default: {
      return ml_router_unexpected(namespace);
    }
  }
}

function rp_72756e74696d652e424f4f5453545241505f41444d494e5f54544c5f484f555253() {
  return ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function rp_72756e74696d652e424f4f5453545241505f41444d494e5f4c4142454c() {
  return "bootstrap-admin";
}

function rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253() {
  return 64n;
}

function rp_73656375726974795f686561646572732e434f4e54454e545f53454355524954595f504f4c494359() {
  return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
}

function rp_73746f705f73657175656e6365732e6d6c5f696d706c5f3633373236313734363532653733373436663730356637333635373137353635366536333635373332653533373436663730353336353731373536353665363336353436363936633734363537325f366536353737(sequences) {
  if (!ml_router_array(sequences, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = ml_router_collect(ml_router_filter(ml_router_iter(sequences), (sequence) => { return !(sequence.length === 0); }));
  const ml_record2 = "";
  const ml_record3 = false;
  return Object.freeze({ $: "StopSequenceFilter", ["sequences"]: ml_record1, ["pending"]: ml_record2, ["stopped"]: ml_record3 });
}

function rp_73746f705f73657175656e6365732e6d6c5f696d706c5f3633373236313734363532653733373436663730356637333635373137353635366536333635373332653533373436663730353336353731373536353665363336353436363936633734363537325f3635366536313632366336353634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_73746f705f73657175656e6365732e53746f7053657175656e636546696c746572"}, ml_host_value_schema_61dfd53674d645afd1c8de731523520c1e33ba3584a42b1556b50d4958ecf679, { refinements: ml_host_value_refinements_61dfd53674d645afd1c8de731523520c1e33ba3584a42b1556b50d4958ecf679 });
  return !((router_self).sequences.length === 0);
}

function rp_73746f726167652e6173736f636961746976652e54595045() {
  return "Type";
}

function rp_73746f726167652e6173736f636961746976652e544f4b454e5f5245434f5244() {
  return "TokenRecord";
}

function rp_73746f726167652e6173736f636961746976652e53554254595045() {
  return "SubType";
}

function rp_73746f726167652e6173736f636961746976652e56414c5545() {
  return "Value";
}

function rp_73746f726167652e6173736f636961746976652e53544f524147455f464f524d4154() {
  return "StorageFormat";
}

function rp_73746f726167652e6173736f636961746976652e464f524d41545f56455253494f4e() {
  return "router-token-doublets-v1";
}

function rp_73746f726167652e6173736f636961746976652e5245434f52445f505245464958() {
  return "Record/";
}

function rp_73746f726167652e6173736f636961746976652e535452494e475f544147() {
  return 1n;
}

function rp_73746f726167652e6173736f636961746976652e454447455f544147() {
  return 2n;
}

function rp_73746f726167652e6173736f636961746976652e454d5054595f53455155454e4345() {
  return 3n;
}

function rp_73746f726167652e6173736f636961746976652e425954455f4e4f44455f5354415254() {
  return 4n;
}

function rp_73746f726167652e6173736f636961746976652e534348454d415f4e4f44455f434f554e54() {
  return 259n;
}

function rp_73747265616d5f7465726d696e6174696f6e2e494e434f4d504c4554455f53545245414d5f4d455353414745() {
  return "upstream stream ended before completion";
}

function rp_73747265616d5f7465726d696e6174696f6e2e4d41585f5353455f43415252595f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_73747265616d5f7465726d696e6174696f6e2e6d6c5f696d706c5f3633373236313734363532653733373437323635363136643566373436353732366436393665363137343639366636653265343636313639366337353732363534623639366536345f3666363635663639366535663632363136653634(event) {
try {
  ml_validate_rust_value(event, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  const code = ml_router_try(ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_pointer(event, "/error/code"), () => { return ml_host_serde_json_value_get_string(event, "code"); }, "or_else"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_2_0); }, "and_then"), true);
  if ((code === "upstream_timeout")) {
    return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Stalled' }) });
  } else {
    if ((code === "upstream_interrupted")) {
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Interrupted' }) });
    } else {
      if ((code === "upstream_incomplete")) {
        return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Truncated' }) });
      } else {
        return Object.freeze({ $: 'None' });
      }
    }
  }

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

function rp_73747265616d5f7465726d696e6174696f6e2e6d6c5f696d706c5f36333732363137343635326537333734373236353631366435663734363537323664363936653631373436393666366532653534363537323664363936653631366334353736363536653734343436353734363536333734366637325f366436393634356636363732363136643635(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_73747265616d5f7465726d696e6174696f6e2e5465726d696e616c4576656e744465746563746f72"}, ml_host_value_schema_c4b47d79bd7fb30e5f44f88a340c8dcd3e2121c7c72685fb6db4332ec3f01ff5, { refinements: ml_host_value_refinements_c4b47d79bd7fb30e5f44f88a340c8dcd3e2121c7c72685fb6db4332ec3f01ff5 });
  return !((router_self).carry.length === 0);
}

function rp_737562736372697074696f6e2e65787465726e616c2e524f555445525f4d455441444154415f4b4559() {
  return "_link_assistant_router";
}

function rp_737562736372697074696f6e2e65787465726e616c2e524546524553485f4f574e45525f4b4559() {
  return "refresh_owner";
}

function rp_737562736372697074696f6e2e65787465726e616c2e45585445524e414c5f524546524553485f4f574e4552() {
  return "external";
}

function rp_737562736372697074696f6e2e65787465726e616c2e43524544454e5449414c5f534f555243455f4b4559() {
  return "credential_source";
}

function rp_737562736372697074696f6e2e65787465726e616c2e50524f4d4f54494f4e5f524543454950545f4b4559() {
  return "promotion_receipt";
}

function rp_737562736372697074696f6e5f70726f78792e434f4445585f524553504f4e5345535f4c4954455f484541444552() {
  return "x-openai-internal-codex-responses-lite";
}

function rp_737562736372697074696f6e5f75736167652e534348454d415f56455253494f4e() {
  return 1n;
}

function rp_737562736372697074696f6e5f75736167652e4d41585f55534147455f424f4459() {
  return ml_fixed((ml_fixed((2n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_74656c656772616d2e504f4c4c5f54494d454f55545f53454353() {
  return 30n;
}

function rp_74656c656772616d2e4552524f525f4241434b4f4646() {
  return ml_host_std_time_duration_from_secs(5n);
}

function rp_74656c656772616d2e414c4c4f5745445f55504441544553() {
  return "[\"message\"]";
}

function rp_74656c656772616d2e7570646174655f6964(update) {
  ml_validate_rust_value(update, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_router_unwrap(ml_host_option_bind(ml_host_serde_json_value_get_string(update, "update_id"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_i64(ml_host_callback_2_0); }, "and_then"), 0n, true);
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f44454641554c545f4d41585f544f4b454e53() {
  return 8192n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4d494e5f5448494e4b494e475f425544474554() {
  return 1024n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4f55545055545f48454144524f4f4d() {
  return 8192n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4f55545055545f464c4f4f52() {
  return 4096n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f46495845445f544f4b454e5f4345494c494e47() {
  return 32000n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f41444150544956455f544f4b454e5f4345494c494e47() {
  return 40192n;
}

function rp_7468696e6b696e672e616e7468726f7069632e726561736f6e696e675f627564676574(effort) {
  if (!(typeof effort === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(effort))) throw new TypeError('argument outside supported Rust value domain');
  if ((effort === "minimal")) {
    return 1024n;
  } else {
    if ((effort === "low")) {
      return 4096n;
    } else {
      if ((effort === "medium")) {
        return 8192n;
      } else {
        if ((effort === "xhigh")) {
          return 24576n;
        } else {
          if ((effort === "max")) {
            return 32000n;
          } else {
            return 16384n;
          }
        }
      }
    }
  }
}

function rp_7468696e6b696e672e616e7468726f7069632e61646170746976655f6566666f7274(effort) {
  if (!(typeof effort === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(effort))) throw new TypeError('argument outside supported Rust value domain');
  if ((effort === "minimal")) {
    return "low";
  } else {
    if ((effort === "low")) {
      return "low";
    } else {
      if ((effort === "medium")) {
        return "medium";
      } else {
        if ((effort === "xhigh")) {
          return "max";
        } else {
          if ((effort === "max")) {
            return "max";
          } else {
            return "high";
          }
        }
      }
    }
  }
}

function rp_7468696e6b696e672e706f6c6963792e6b657973(protocol) {
  ml_validate_rust_value(protocol, {"kind":"data","name":"rp_7468696e6b696e672e5468696e6b696e6750726f746f636f6c"}, ml_host_value_schema_1c499caf4dae6d3d3340ae46e10ab5a1268e3757bf0a7c6ea7cebbc94f754bbe, { refinements: ml_host_value_refinements_1c499caf4dae6d3d3340ae46e10ab5a1268e3757bf0a7c6ea7cebbc94f754bbe });
  switch (protocol.$) {
    case "Anthropic": {
      return Object.freeze(["thinking", "output_config"]);
    }
    case "OpenAIChat": {
      return Object.freeze(["reasoning_effort", "reasoning", "enable_thinking", "thinking_budget"]);
    }
    case "OpenAIResponses": {
      return Object.freeze(["reasoning"]);
    }
    case "Gemini": {
      return Object.freeze(["generationConfig", "generation_config"]);
    }
    case "Vertex": {
      return Object.freeze(["generationConfig", "generation_config"]);
    }
    case "Codex": {
      return Object.freeze(["reasoning"]);
    }
    case "Qwen": {
      return Object.freeze(["reasoning_effort", "reasoning", "enable_thinking", "thinking_budget"]);
    }
    case "Interactions": {
      return Object.freeze(["thinking_level", "thinking_budget"]);
    }
    case "Antigravity": {
      return Object.freeze(["generationConfig", "generation_config"]);
    }
    case "Kimi": {
      return Object.freeze(["thinking", "output_config"]);
    }
    case "Xai": {
      return Object.freeze(["reasoning"]);
    }
    default: {
      return ml_router_unexpected(protocol);
    }
  }
}

function rp_746c732e47454e4552415445445f4449524543544f5259() {
  return "tls";
}

function rp_746c732e47454e4552415445445f43455254() {
  return "cert.pem";
}

function rp_746c732e47454e4552415445445f4b4559() {
  return "key.pem";
}

function rp_746f6b656e2e544f4b454e5f505245464958() {
  return "la_sk_";
}

function rp_746f6b656e2e434f4445585f544f4b454e5f505245464958() {
  return "at-";
}

function rp_746f6b656e2e41444d494e5f53434f5045() {
  return "admin";
}

function rp_746f6b656e5f696d706f72742e4241434b55505f4449524543544f5259() {
  return "token-import-backups";
}

function rp_746f6b656e5f7265736572766174696f6e2e43484152535f5045525f544f4b454e() {
  return 4n;
}

function rp_746f6b656e5f7265736572766174696f6e2e44454641554c545f4d41585f4f55545055545f544f4b454e53() {
  return 4096n;
}

function rp_746f6b656e5f7265736572766174696f6e2e6465636c617265645f6f75747075745f746f6b656e73(body) {
  ml_pattern_immutable(body);
  ml_validate_rust_value(body, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","patternOwnershipRefusal":"non-string reference type"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  for (const field of ml_router_iter(Object.freeze(["max_output_tokens", "max_completion_tokens", "max_tokens"]))) {
    const ml_pattern_2 = ml_host_option_bind(ml_host_serde_json_value_get_string(body, field), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_0_0); }, "and_then");
    if ((ml_pattern_immutable(ml_pattern_2) && (ml_pattern_2.$ === "Some"))) {
      const value = (ml_pattern_2)["field0"];
      return Object.freeze({ $: 'Some', field0: value });
    } else {
    }
  }
  return ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(body, "generationConfig"), (config) => { return ml_host_serde_json_value_get_string(config, "maxOutputTokens"); }, "and_then"), (ml_host_callback_2_0) => { return ml_host_serde_json_value_as_u64(ml_host_callback_2_0); }, "and_then");
}

function rp_746f6b656e5f7365637265742e53454e54494e454c() {
  return "\u0000link-assistant-router:no-token-secret:";
}

function rp_746f6b656e5f7365637265742e7265667573616c() {
  return "TOKEN_SECRET environment variable is required: this command signs or encrypts on this machine, and no signing secret was supplied";
}

function rp_746f6b656e5f7365637265742e46494c455f454e56() {
  return "TOKEN_SECRET_FILE";
}

function rp_766572696669636174696f6e2e534348454d41() {
  return "link-assistant-router/verification/v1";
}

function rp_766572696669636174696f6e2e534b49505f4c4f47() {
  return "ROUTER_VERIFICATION_SKIPS";
}

function rp_74756e6e656c5f636f6d6d616e642e544f4b454e5f454e56() {
  return "LINK_ASSISTANT_ROUTER_TOKEN";
}

function rp_74756e6e656c5f636f6d6d616e642e44454641554c545f494d414745() {
  return "link-assistant-router-tunnel";
}

function rp_74756e6e656c5f636f6d6d616e642e53555045525649534f52() {
  return "while :; do \"$@\"; sleep 5; done";
}

function rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353() {
  return 120n;
}

function rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f434f4e4e4543545f54494d454f55545f53454353() {
  return 10n;
}

function rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f46495253545f425954455f54494d454f55545f53454353() {
  return rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353();
}

function rp_757073747265616d5f636c69656e742e70617273655f74696d656f75745f73656373(value, default_) {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  ml_fixed(default_, 0n, 18446744073709551615n, "u64 argument default_ out of range");
  if (!(typeof default_ === 'bigint' && default_ >= 0n && default_ <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  const seconds = ml_router_unwrap(ml_host_option_bind(value, (value_2) => { return ml_host_result_ok(ml_host_rust_integer_parse_u64((value_2).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, ''))); }, "and_then"), default_, true);
  return ml_host_bool_then((seconds > 0n), () => { return ml_host_std_time_duration_from_secs(seconds); });
}

function rp_757073747265616d5f636c69656e742e70617273655f757073747265616d5f726561645f74696d656f7574(value) {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  return rp_757073747265616d5f636c69656e742e70617273655f74696d656f75745f73656373(value, rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353());
}

function rp_757073747265616d5f67756172642e414c4c4f575f505249564154455f4e4554574f524b535f454e56() {
  return "UPSTREAM_ALLOW_PRIVATE_NETWORKS";
}

function rp_757073747265616d5f67756172642e4d455441444154415f4e414d4553() {
  return Object.freeze(["metadata.google.internal", "metadata", "instance-data"]);
}

function rp_757073747265616d5f67756172642e6d6c5f696d706c5f36333732363137343635326537353730373337343732363536313664356636373735363137323634326534653635373437373666373236623530366636633639363337395f363136633663366637373566363136633663() {
  const ml_record1 = true;
  const ml_record2 = true;
  const ml_record3 = true;
  const ml_record4 = true;
  return Object.freeze({ $: "NetworkPolicy", ["loopback"]: ml_record1, ["private"]: ml_record2, ["link_local"]: ml_record3, ["all"]: ml_record4 });
}

function rp_757073747265616d5f67756172642e6d6c5f696d706c5f3633373236313734363532653735373037333734373236353631366435663637373536313732363432653437373536313732363436353634353236353733366636633736363537325f366536353737(policy) {
  ml_validate_rust_value(policy, {"kind":"data","name":"rp_757073747265616d5f67756172642e4e6574776f726b506f6c696379"}, ml_host_value_schema_a113c5f551c9c7f8f771017692d47d22e0050629dd38a981de94775ced7086fe, { refinements: ml_host_value_refinements_a113c5f551c9c7f8f771017692d47d22e0050629dd38a981de94775ced7086fe });
  const ml_record1 = policy;
  return Object.freeze({ $: "GuardedResolver", ["policy"]: ml_record1 });
}

function rp_75736167652e455354494d415445445f43484152535f5045525f544f4b454e() {
  return 4n;
}

function rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(90n);
}

function rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245() {
  return Object.freeze(["-p", "ok"]);
}

function rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245() {
  return Object.freeze(["exec", "--skip-git-repo-check", "ok"]);
}

function rp_76656e646f725f636c695f726566726573682e50524f42455f415247535f454e56() {
  return "ROUTER_VENDOR_REFRESH_ARGS";
}

function rp_766572696669636174696f6e5f636c69656e742e7361666574795f666f72(os) {
  if (!(typeof os === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(os))) throw new TypeError('argument outside supported Rust value domain');
  if ((os === "macos")) {
    return Object.freeze({ $: 'Err', field0: "safe OS credential-store boundary unavailable: native macOS vendor probes are refused before version, doctor or TUI; use the disposable Linux verification environment" });
  } else {
    return Object.freeze({ $: 'Ok', field0: null });
  }
}

function rp_766572696669636174696f6e5f636c69656e742e434c49454e5453() {
  return Object.freeze([Object.freeze({ $: 'Tuple', field0: "claude", field1: "ROUTER_REAL_CLIENT_CLAUDE_VERSION" }), Object.freeze({ $: 'Tuple', field0: "codex", field1: "ROUTER_REAL_CLIENT_CODEX_VERSION" }), Object.freeze({ $: 'Tuple', field0: "opencode", field1: "ROUTER_REAL_CLIENT_OPENCODE_VERSION" })]);
}

function rp_766b2e4150495f56455253494f4e() {
  return "5.199";
}

function rp_766b2e574149545f53454353() {
  return 25n;
}

function rp_766b2e4552524f525f4241434b4f4646() {
  return ml_host_std_time_duration_from_secs(5n);
}

function rp_766b2e434841545f504545525f4f4646534554() {
  return 2000000000n;
}

function rp_766b2e69735f70726976617465(peer_id, from_id) {
  ml_fixed(peer_id, -9223372036854775808n, 9223372036854775807n, "i64 argument peer_id out of range");
  if (!(typeof peer_id === 'bigint' && peer_id >= -9223372036854775808n && peer_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(from_id, -9223372036854775808n, 9223372036854775807n, "i64 argument from_id out of range");
  if (!(typeof from_id === 'bigint' && from_id >= -9223372036854775808n && from_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return (((peer_id === from_id) && (from_id > 0n)) && (peer_id < rp_766b2e434841545f504545525f4f4646534554()));
}

function rp_7761726d75702e5741524d55505f54455854() {
  return "Warmup";
}

function rp_7a61695f636f64696e675f706c616e2e414e5448524f5049435f424153455f50415448() {
  return "/api/anthropic";
}

function rp_7a61695f636f64696e675f706c616e2e434841545f424153455f50415448() {
  return "/api/coding/paas/v4";
}

function rp_7a61695f636f64696e675f706c616e2e524553504f4e5345535f424153455f50415448() {
  return "/api/v1";
}

function rp_7a61695f636f64696e675f706c616e2e4845414c54485f50415448() {
  return "/api/monitor/usage/quota/limit";
}

function rp_7a61695f636f64696e675f706c616e2e434154414c4f475f50415448() {
  return "/api/anthropic/v1/models";
}

function rp_7a61695f636f64696e675f706c616e2e434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_7a61695f636f64696e675f706c616e2e4641494c45445f524546524553485f5245545259() {
  return ml_host_std_time_duration_from_secs(15n);
}

function rp_7a61695f636f64696e675f706c616e2e4d41585f434154414c4f475f424f4459() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_7a61695f636f64696e675f706c616e2e6d6c5f696d706c5f36333732363137343635326537613631363935663633366636343639366536373566373036633631366532653561363136393530373236663632363534363631363936633735373236355f366536353737(kind, message) {
  ml_validate_rust_value(kind, {"kind":"data","name":"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c7572654b696e64"}, ml_host_value_schema_88474d9f92da6bba9f1da984f384993a39d4d4df82ae06af296d002e910f6475, { refinements: ml_host_value_refinements_88474d9f92da6bba9f1da984f384993a39d4d4df82ae06af296d002e910f6475 });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = kind;
  const ml_record2 = message;
  return Object.freeze({ $: "ZaiProbeFailure", ["kind"]: ml_record1, ["message"]: ml_record2 });
}

function rp_7a61695f636f64696e675f706c616e2e6d6c5f696d706c5f36333732363137343635326537613631363935663633366636343639366536373566373036633631366532653561363136393530373236663632363534363631363936633735373236355f3662363936653634(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_7a61695f636f64696e675f706c616e2e5a616950726f62654661696c757265"}, ml_host_value_schema_60c64955d2621ea17dc08bfce2195e5d8ac9dc6c374f0ffba7fa736e430ce1c1, { refinements: ml_host_value_refinements_60c64955d2621ea17dc08bfce2195e5d8ac9dc6c374f0ffba7fa736e430ce1c1 });
  return (router_self).kind;
}

function rp_7a61695f757073747265616d5f6572726f722e4558484155535445445f434f444553() {
  return Object.freeze([1113n, 1309n, 1310n, 1311n, 1314n, 1315n, 1316n, 1317n, 1318n, 1319n, 1320n, 1321n]);
}

function rp_7a61695f757073747265616d5f6572726f722e4d41585f434c41535349464945445f424f4459() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_7a61695f757073747265616d5f6572726f722e53544154455f46494c45() {
  return "provider-exhaustion.json";
}

function rp_616e7468726f7069635f6e6f6e73747265616d2e4d41585f42554646455245445f524553504f4e5345() {
  return ml_fixed((ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6465706c6f795f6c6f63616c2e535045435f56455253494f4e() {
  return "local-v1";
}

function rp_6465706c6f795f6c6f63616c2e636c617564655f73686172652e43524544454e5449414c5f46494c45() {
  return ".credentials.json";
}

function rp_6465706c6f795f6c6f63616c2e636c617564655f73686172652e4c4142454c5f535546464958() {
  return "claude-credentials";
}

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e444541444c494e45() {
  return ml_host_std_time_duration_from_secs(10n);
}

function rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e534348454d41() {
  return "link-assistant-router/data-backup/v1";
}

function rp_6465706c6f795f6c6f63616c2e686f73742e524f4c4c4241434b5f434f4d4d414e44() {
  return "router deploy --mode container";
}

function rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f454e56() {
  return "ROUTER_PRESERVATION_TOKEN";
}

function rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f534352495054() {
  return "const r=await fetch('http://127.0.0.1:8080/api/models',{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_PRESERVATION_TOKEN}});if(r.status!==200)process.exit(2);const b=await r.json();if(!Array.isArray(b.data))process.exit(3);console.log(JSON.stringify(b.data.map(m=>String(m.owned_by||'')+'/'+m.id).sort()))";
}

function rp_6465706c6f795f6c6f63616c2e72756e74696d655f656e762e4c4142454c5f535546464958() {
  return "runtime-env";
}

function rp_6465706c6f795f6c6f63616c2e7365637265742e4c4142454c5f535546464958() {
  return "token-secret";
}

function rp_6465706c6f795f6c6f63616c2e7365637265742e50524f42455f454e56() {
  return "ROUTER_DEPLOY_PROBE_TOKEN";
}

function rp_6465706c6f795f6c6f63616c2e7365637265742e50524f42455f534352495054() {
  return "const r=await fetch('http://127.0.0.1:8080/api/models',{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_DEPLOY_PROBE_TOKEN}});console.log(r.status)";
}

function rp_6465706c6f795f6c6f63616c2e7365637265742e70726f62655f6163636570746564(status) {
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  return ((status !== 401n) && (status < 500n));
}

function rp_6465706c6f795f6c6f63616c2e736572766963652e4d414e414745525f454e56() {
  return "LINK_ASSISTANT_ROUTER_SERVICE_MANAGER";
}

function rp_6465706c6f795f6c6f63616c2e736572766963652e5245434f5244() {
  return "service.json";
}

function rp_6465706c6f795f6c6f63616c2e736572766963652e534543524554() {
  return "token-secret";
}

function rp_6465706c6f795f6c6f63616c2e73746167696e672e4c4142454c() {
  return "com.link-assistant.router.staging";
}

function rp_6465706c6f795f6c6f63616c2e73746167696e672e4d41524b4552() {
  return "staging.json";
}

function rp_6465706c6f795f72656d6f74652e4147454e545f4c454153455f45584954() {
  return 73n;
}

function rp_6465706c6f795f72656d6f74652e5452414e53504f52545f45584954() {
  return 10n;
}

function rp_6465706c6f795f72656d6f74652e4c454153455f45584954() {
  return 11n;
}

function rp_6465706c6f795f72656d6f74652e73657373696f6e2e444541444c494e455f45584954() {
  return 12n;
}

function rp_6465706c6f795f72656d6f74652e73657373696f6e2e4556454e545f505245464958() {
  return "ROUTER_DEPLOY_EVENT ";
}

function rp_6c6f67735f636c692e53484f574e() {
  return 5n;
}

function rp_6163636f756e745f706f6c6963795f64697370617463682e4d41585f4552524f525f4259544553() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6163636f756e745f706f6c6963795f726573706f6e73652e4d41585f524553504f4e53455f4259544553() {
  return ml_fixed((ml_fixed((32n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6163636f756e745f706f6c6963795f726573706f6e73652e4d41585f4556454e545f4259544553() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6163636f756e745f726f7574696e675f706f6c6963792e504f4c4943595f46494c45() {
  return "routing-policy.json";
}

function rp_6163636f756e745f726f7574696e675f706f6c6963792e434f50595f4845414445525f414c4c4f575f4c495354() {
  return Object.freeze(["x-request-id", "x-correlation-id", "traceparent", "tracestate", "x-claude-code-session-id", "x-codex-session-id", "x-session-id", "session-id"]);
}

function rp_6d616e6167656d656e745f6163636573732e534e415053484f54() {
  return "management-lockouts.lenv";
}
export const translated = Object.freeze({ ["account_http.DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS"]: rp_6163636f756e745f687474702e44454641554c545f4143434f554e545f504f4f4c5f49444c455f54494d454f55545f53454353(), ["account_http.DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS"]: rp_6163636f756e745f687474702e44454641554c545f4143434f554e545f434f4e4e454354494f4e5f4d41585f4147455f53454353(), ["account_http.PROXY_SCHEMES"]: rp_6163636f756e745f687474702e50524f58595f534348454d4553(), ["account_limits.UNIFIED_PREFIX"]: rp_6163636f756e745f6c696d6974732e554e49464945445f505245464958(), ["account_limits.MAX_VENDOR_COOLDOWN"]: rp_6163636f756e745f6c696d6974732e4d41585f56454e444f525f434f4f4c444f574e(), ["account_limits.STATE_FILE"]: rp_6163636f756e745f6c696d6974732e53544154455f46494c45(), ["accounts_cli.DEFAULT_PAUSE_REASON"]: rp_6163636f756e74735f636c692e44454641554c545f50415553455f524541534f4e(), ["accounts_cli.LOCAL_NOTE"]: rp_6163636f756e74735f636c692e4c4f43414c5f4e4f5445(), ["activitypub.ACTIVITY_JSON"]: rp_61637469766974797075622e41435449564954595f4a534f4e(), ["admin.ADMIN_TOKEN_PREFIX"]: rp_61646d696e2e41444d494e5f544f4b454e5f505245464958(), ["admin.CLAIM_FILE_NAME"]: rp_61646d696e2e434c41494d5f46494c455f4e414d45(), ["admin.CLAIM_TOKEN_LABEL"]: rp_61646d696e2e434c41494d5f544f4b454e5f4c4142454c(), ["admin_recovery.RECOVERED_ADMIN_LABEL"]: rp_61646d696e5f7265636f766572792e5245434f56455245445f41444d494e5f4c4142454c(), ["anthropic_bridge.DEFAULT_MAX_TOKENS"]: rp_616e7468726f7069635f6272696467652e44454641554c545f4d41585f544f4b454e53(), ["anthropic_stream.map_stop_reason"]: rp_616e7468726f7069635f73747265616d2e6d61705f73746f705f726561736f6e, ["anthropic_stream.response_content_key"]: rp_616e7468726f7069635f73747265616d2e726573706f6e73655f636f6e74656e745f6b6579, ["api_error.openai_error_type"]: rp_6170695f6572726f722e6f70656e61695f6572726f725f74797065, ["api_error.openai_error_code"]: rp_6170695f6572726f722e6f70656e61695f6572726f725f636f6465, ["audit.surface_name"]: rp_61756469742e737572666163655f6e616d65, ["auth.CODEX_CLIENT_ID"]: rp_617574682e434f4445585f434c49454e545f4944(), ["auth.CODEX_ISSUER"]: rp_617574682e434f4445585f495353554552(), ["auth.CODEX_CALLBACK_PATH"]: rp_617574682e434f4445585f43414c4c4241434b5f50415448(), ["auth.CODEX_DEVICE_CALLBACK_PATH"]: rp_617574682e434f4445585f4445564943455f43414c4c4241434b5f50415448(), ["auth_remote.REQUEST_TIMEOUT"]: rp_617574685f72656d6f74652e524551554553545f54494d454f5554(), ["auth_remote.status_of"]: rp_617574685f72656d6f74652e7374617475735f6f66, ["bridge_controls.CHAT_FIELDS"]: rp_6272696467655f636f6e74726f6c732e434841545f4649454c4453(), ["bridge_controls.RESPONSE_FIELDS"]: rp_6272696467655f636f6e74726f6c732e524553504f4e53455f4649454c4453(), ["bridge_response.stop_semantics"]: rp_6272696467655f726573706f6e73652e73746f705f73656d616e74696373, ["bridge_response.complete"]: rp_6272696467655f726573706f6e73652e636f6d706c657465, ["bridge_response.incomplete"]: rp_6272696467655f726573706f6e73652e696e636f6d706c657465, ["bridge_selection.MODEL_SELECTION_REQUIRED"]: rp_6272696467655f73656c656374696f6e2e4d4f44454c5f53454c454354494f4e5f5245515549524544(), ["chat_admin.DEFAULT_SECRET_TTL_SECS"]: rp_636861745f61646d696e2e44454641554c545f5345435245545f54544c5f53454353(), ["chat_admin.DEFAULT_RATE_LIMIT_PER_MINUTE"]: rp_636861745f61646d696e2e44454641554c545f524154455f4c494d49545f5045525f4d494e555445(), ["chat_admin.RATE_LIMIT_WINDOW"]: rp_636861745f61646d696e2e524154455f4c494d49545f57494e444f57(), ["chat_admin.SESSION_IDLE_TTL"]: rp_636861745f61646d696e2e53455353494f4e5f49444c455f54544c(), ["chat_admin.MAX_SESSIONS"]: rp_636861745f61646d696e2e4d41585f53455353494f4e53(), ["chat_admin.ALREADY_CLAIMED"]: rp_636861745f61646d696e2e414c52454144595f434c41494d4544(), ["chat_admin.RATE_LIMITED"]: rp_636861745f61646d696e2e524154455f4c494d49544544(), ["chat_admin.HELP"]: rp_636861745f61646d696e2e48454c50(), ["chat_commands.DEFAULT_ISSUE_TTL_HOURS"]: rp_636861745f636f6d6d616e64732e44454641554c545f49535355455f54544c5f484f555253(), ["chat_commands.LIST_LIMIT"]: rp_636861745f636f6d6d616e64732e4c4953545f4c494d4954(), ["chat_commands.ISSUE_KEYS"]: rp_636861745f636f6d6d616e64732e49535355455f4b455953(), ["chat_commands.yes_no"]: rp_636861745f636f6d6d616e64732e7965735f6e6f, ["claude_auth.CLAUDE_AUTHORIZE_URL"]: rp_636c617564655f617574682e434c415544455f415554484f52495a455f55524c(), ["claude_auth.CLAUDE_REDIRECT_URI"]: rp_636c617564655f617574682e434c415544455f52454449524543545f555249(), ["claude_auth.CLAUDE_SCOPES"]: rp_636c617564655f617574682e434c415544455f53434f504553(), ["claude_auth.CLAUDE_INFERENCE_SCOPE"]: rp_636c617564655f617574682e434c415544455f494e464552454e43455f53434f5045(), ["claude_auth.PENDING_LOGIN_FILE"]: rp_636c617564655f617574682e50454e44494e475f4c4f47494e5f46494c45(), ["claude_identity.CLAUDE_CODE_SYSTEM_PROMPT"]: rp_636c617564655f6964656e746974792e434c415544455f434f44455f53595354454d5f50524f4d5054(), ["claude_identity.DEFAULT_CLIENT_VERSION"]: rp_636c617564655f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e(), ["claude_identity.is_oauth_credential"]: rp_636c617564655f6964656e746974792e69735f6f617574685f63726564656e7469616c, ["claude_identity.first_block_is_identity"]: rp_636c617564655f6964656e746974792e66697273745f626c6f636b5f69735f6964656e74697479, ["client_command.CLIENT_TOKEN_ENV"]: rp_636c69656e745f636f6d6d616e642e434c49454e545f544f4b454e5f454e56(), ["client_command.CLIENT_TOKEN_ENV_ALIAS"]: rp_636c69656e745f636f6d6d616e642e434c49454e545f544f4b454e5f454e565f414c494153(), ["client_launch.CLAUDE_NATIVE_SERVICES_LIMITATION"]: rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f53455256494345535f4c494d49544154494f4e(), ["client_launch.CLAUDE_NATIVE_SERVICE_REQUEST_ERROR"]: rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f534552564943455f524551554553545f4552524f52(), ["client_lifecycle.active.PROFILE_VARIABLES"]: rp_636c69656e745f6c6966656379636c652e6163746976652e50524f46494c455f5641524941424c4553(), ["client_lifecycle.active.SETTLE_DELAY"]: rp_636c69656e745f6c6966656379636c652e6163746976652e534554544c455f44454c4159(), ["client_policy.PROXIED_CLIENT_EVIDENCE_HEADER"]: rp_636c69656e745f706f6c6963792e50524f584945445f434c49454e545f45564944454e43455f484541444552(), ["client_policy.PROXIED_CODEX_EVIDENCE_VALUE"]: rp_636c69656e745f706f6c6963792e50524f584945445f434f4445585f45564944454e43455f56414c5545(), ["clients.CODEX_PROVIDER"]: rp_636c69656e74732e434f4445585f50524f5649444552(), ["clients.CODEX_TOKEN_ENV"]: rp_636c69656e74732e434f4445585f544f4b454e5f454e56(), ["clients.CLAUDE_TOKEN_ENV"]: rp_636c69656e74732e434c415544455f544f4b454e5f454e56(), ["clients.CLAUDE_BASE_ENV"]: rp_636c69656e74732e434c415544455f424153455f454e56(), ["clients.ROUTER_TOKEN_ENV"]: rp_636c69656e74732e524f555445525f544f4b454e5f454e56(), ["clients.GROK_TOKEN_ENV"]: rp_636c69656e74732e47524f4b5f544f4b454e5f454e56(), ["clients.GROK_BASE_ENV"]: rp_636c69656e74732e47524f4b5f424153455f454e56(), ["clients.ROUTER_PROVIDER"]: rp_636c69656e74732e524f555445525f50524f5649444552(), ["clients.OWNERSHIP_MARKER"]: rp_636c69656e74732e4f574e4552534849505f4d41524b4552(), ["clients.OPENAI_MODEL_OWNER"]: rp_636c69656e74732e4f50454e41495f4d4f44454c5f4f574e4552(), ["clients.ANTHROPIC_MODEL_OWNER"]: rp_636c69656e74732e414e5448524f5049435f4d4f44454c5f4f574e4552(), ["clients.GOOGLE_MODEL_OWNER"]: rp_636c69656e74732e474f4f474c455f4d4f44454c5f4f574e4552(), ["clients.QWEN_MODEL_OWNER"]: rp_636c69656e74732e5157454e5f4d4f44454c5f4f574e4552(), ["clients.ZAI_MODEL_OWNER"]: rp_636c69656e74732e5a41495f4d4f44454c5f4f574e4552(), ["clients.DEFAULT_OPENAI_REASONING_EFFORT"]: rp_636c69656e74732e44454641554c545f4f50454e41495f524541534f4e494e475f4546464f5254(), ["clients.DEFAULT_ANTHROPIC_REASONING_EFFORT"]: rp_636c69656e74732e44454641554c545f414e5448524f5049435f524541534f4e494e475f4546464f5254(), ["clients.catalog.FRESH_ZAI_PREFERRED_MODEL"]: rp_636c69656e74732e636174616c6f672e46524553485f5a41495f5052454645525245445f4d4f44454c(), ["clients.doctor.DOCTOR_EVIDENCE_HEADER"]: rp_636c69656e74732e646f63746f722e444f43544f525f45564944454e43455f484541444552(), ["clients.doctor.DOCTOR_EVIDENCE_VALUE"]: rp_636c69656e74732e646f63746f722e444f43544f525f45564944454e43455f56414c5545(), ["clients.doctor.MINIMUM_CLAUDE_GATEWAY_VERSION"]: rp_636c69656e74732e646f63746f722e4d494e494d554d5f434c415544455f474154455741595f56455253494f4e(), ["codex_cloudflare_cookies.MAX_COOKIE_BYTES"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f4259544553(), ["codex_cloudflare_cookies.MAX_COOKIE_COUNT"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f434f554e54(), ["codex_cloudflare_cookies.MAX_COOKIE_HEADER_BYTES"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f4845414445525f4259544553(), ["codex_cloudflare_cookies.EXACT_HOSTS"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f484f535453(), ["codex_cloudflare_cookies.SUBDOMAIN_SUFFIXES"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e535542444f4d41494e5f5355464649584553(), ["codex_cloudflare_cookies.EXACT_COOKIE_NAMES"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f434f4f4b49455f4e414d4553(), ["codex_identity.DEFAULT_CLIENT_VERSION"]: rp_636f6465785f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e(), ["codex_identity.ORIGINATOR"]: rp_636f6465785f6964656e746974792e4f524947494e41544f52(), ["codex_loopback_bridge.BACKEND_PATH"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4241434b454e445f50415448(), ["codex_loopback_bridge.CONNECT_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e434f4e4e4543545f54494d454f5554(), ["codex_loopback_bridge.HEALTH_HEADER"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4845414c54485f484541444552(), ["codex_loopback_bridge.DAEMON_MARKER_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4d41524b45525f454e56(), ["codex_loopback_bridge.DAEMON_UPSTREAM_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f555053545245414d5f454e56(), ["codex_loopback_bridge.DAEMON_STATE_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f53544154455f454e56(), ["codex_loopback_bridge.DAEMON_NONCE_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4e4f4e43455f454e56(), ["codex_loopback_bridge.DAEMON_LISTEN_ENV"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e4441454d4f4e5f4c495354454e5f454e56(), ["codex_loopback_bridge.START_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544152545f54494d454f5554(), ["codex_loopback_bridge.STOP_TIMEOUT"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e53544f505f54494d454f5554(), ["codex_loopback_bridge.POLL_INTERVAL"]: rp_636f6465785f6c6f6f706261636b5f6272696467652e504f4c4c5f494e54455256414c(), ["codex_remote_control.CONTINUATION_PREFIX"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e434f4e54494e554154494f4e5f505245464958(), ["codex_remote_control.FILE_NAME"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e46494c455f4e414d45(), ["codex_remote_control.ROOT"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e524f4f54(), ["codex_remote_control.SERVER"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e534552564552(), ["codex_remote_control.ENROLL"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e454e524f4c4c(), ["codex_remote_control.REFRESH"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e52454652455348(), ["codex_remote_control.REFRESH_UPSTREAM"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e524546524553485f555053545245414d(), ["codex_remote_control.PAIR"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e50414952(), ["codex_remote_control.PAIR_STATUS"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e504149525f535441545553(), ["codex_remote_control.ENVIRONMENTS"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e454e5649524f4e4d454e5453(), ["config_defaults.default_gonka_model"]: rp_636f6e6669675f64656661756c74732e64656661756c745f676f6e6b615f6d6f64656c, ["config_defaults.default_openai_compatible_base_url"]: rp_636f6e6669675f64656661756c74732e64656661756c745f6f70656e61695f636f6d70617469626c655f626173655f75726c, ["conversation_record.RECORD_ENV"]: rp_636f6e766572736174696f6e5f7265636f72642e5245434f52445f454e56(), ["conversation_record.REPLAY_ENV"]: rp_636f6e766572736174696f6e5f7265636f72642e5245504c41595f454e56(), ["conversation_record.REPLAY_TURN_HEADER"]: rp_636f6e766572736174696f6e5f7265636f72642e5245504c41595f5455524e5f484541444552(), ["conversation_record.REFRAMED_HEADERS"]: rp_636f6e766572736174696f6e5f7265636f72642e52454652414d45445f48454144455253(), ["conversation_record.MAX_RECORDED_BODY"]: rp_636f6e766572736174696f6e5f7265636f72642e4d41585f5245434f524445445f424f4459(), ["conversation_record.matching.IGNORED_HEADERS"]: rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e49474e4f5245445f48454144455253(), ["conversation_record.matching.COMPARED_FIELDS"]: rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e434f4d50415245445f4649454c4453(), ["conversation_record.matching.RENDERED_LIMIT"]: rp_636f6e766572736174696f6e5f7265636f72642e6d61746368696e672e52454e44455245445f4c494d4954(), ["conversation_record.store.HEADER_PHASE"]: rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e4845414445525f5048415345(), ["conversation_record.store.TURN_PHASE"]: rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e5455524e5f5048415345(), ["conversation_record.store.read_provenance"]: rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e726561645f70726f76656e616e6365, ["conversation_record.store.string_field"]: rp_636f6e766572736174696f6e5f7265636f72642e73746f72652e737472696e675f6669656c64, ["crater.ACTIVITY_JSON"]: rp_6372617465722e41435449564954595f4a534f4e(), ["crater.LINKED_DATA_JSON"]: rp_6372617465722e4c494e4b45445f444154415f4a534f4e(), ["crater.DEFAULT_MODEL"]: rp_6372617465722e44454641554c545f4d4f44454c(), ["credential_acceptance.ACCEPTANCE_TIMEOUT"]: rp_63726564656e7469616c5f616363657074616e63652e414343455054414e43455f54494d454f5554(), ["credential_acceptance.STAGING_DIRECTORY"]: rp_63726564656e7469616c5f616363657074616e63652e53544147494e475f4449524543544f5259(), ["credential_recovery_store.RECOVERY_DIRECTORY"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e5245434f564552595f4449524543544f5259(), ["credential_recovery_store.PRIMARY_ACCOUNT"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e5052494d4152595f4143434f554e54(), ["credential_recovery_store.CREDENTIAL_LOCK_TIMEOUT"]: rp_63726564656e7469616c5f7265636f766572795f73746f72652e43524544454e5449414c5f4c4f434b5f54494d454f5554(), ["credential_source.ROUTER_METADATA_KEY"]: rp_63726564656e7469616c5f736f757263652e524f555445525f4d455441444154415f4b4559(), ["credential_source.CREDENTIAL_SOURCE_KEY"]: rp_63726564656e7469616c5f736f757263652e43524544454e5449414c5f534f555243455f4b4559(), ["credential_source.REFRESH_OWNER_KEY"]: rp_63726564656e7469616c5f736f757263652e524546524553485f4f574e45525f4b4559(), ["credential_source.EXTERNAL_REFRESH_OWNER"]: rp_63726564656e7469616c5f736f757263652e45585445524e414c5f524546524553485f4f574e4552(), ["credential_store.LOCK_SUFFIX"]: rp_63726564656e7469616c5f73746f72652e4c4f434b5f535546464958(), ["deploy.CONTAINER"]: rp_6465706c6f792e434f4e5441494e4552(), ["deploy.RELAY"]: rp_6465706c6f792e52454c4159(), ["deploy.NETWORK"]: rp_6465706c6f792e4e4554574f524b(), ["deploy.BACKEND_PREFIX"]: rp_6465706c6f792e4241434b454e445f505245464958(), ["deploy.LABEL_KEY"]: rp_6465706c6f792e4c4142454c5f4b4559(), ["deploy.LABEL"]: rp_6465706c6f792e4c4142454c(), ["deploy.DEFAULT_PORT"]: rp_6465706c6f792e44454641554c545f504f5254(), ["deploy.HEALTH_TIMEOUT"]: rp_6465706c6f792e4845414c54485f54494d454f5554(), ["deploy.DEPLOY_TOKEN_LABEL"]: rp_6465706c6f792e4445504c4f595f544f4b454e5f4c4142454c(), ["deploy_config.RESERVED_ENV"]: rp_6465706c6f795f636f6e6669672e52455345525645445f454e56(), ["deploy_config.RESERVED_ENV_PREFIXES"]: rp_6465706c6f795f636f6e6669672e52455345525645445f454e565f5052454649584553(), ["deploy_config.VERIFIABLE_CLIENTS"]: rp_6465706c6f795f636f6e6669672e56455249464941424c455f434c49454e5453(), ["deploy_relay.STATE_ENV"]: rp_6465706c6f795f72656c61792e53544154455f454e56(), ["deploy_relay.LISTENERS_ENV"]: rp_6465706c6f795f72656c61792e4c495354454e4552535f454e56(), ["deploy_seed.METADATA_KEY"]: rp_6465706c6f795f736565642e4d455441444154415f4b4559(), ["deploy_seed.HANDOVER_KEY"]: rp_6465706c6f795f736565642e48414e444f5645525f4b4559(), ["doctor.latest_version.RELEASE_API"]: rp_646f63746f722e6c61746573745f76657273696f6e2e52454c454153455f415049(), ["durable_file.ROLLBACK_SUFFIX"]: rp_64757261626c655f66696c652e524f4c4c4241434b5f535546464958(), ["durable_file.COMMIT_SUFFIX"]: rp_64757261626c655f66696c652e434f4d4d49545f535546464958(), ["durable_file.LOCK_POLL_INTERVAL"]: rp_64757261626c655f66696c652e4c4f434b5f504f4c4c5f494e54455256414c(), ["emergency_auth.FLAG"]: rp_656d657267656e63795f617574682e464c4147(), ["emergency_auth.ENV"]: rp_656d657267656e63795f617574682e454e56(), ["emergency_auth.ALLOW_NON_LOOPBACK_ENV"]: rp_656d657267656e63795f617574682e414c4c4f575f4e4f4e5f4c4f4f504241434b5f454e56(), ["emergency_auth.DURATION_ENV"]: rp_656d657267656e63795f617574682e4455524154494f4e5f454e56(), ["emergency_auth.SUBJECT_PREFIX"]: rp_656d657267656e63795f617574682e5355424a4543545f505245464958(), ["emergency_auth.LABEL"]: rp_656d657267656e63795f617574682e4c4142454c(), ["emergency_auth.HEALTH_HEADER"]: rp_656d657267656e63795f617574682e4845414c54485f484541444552(), ["encoded_request_body.MAX_DECOMPRESSION_RATIO"]: rp_656e636f6465645f726571756573745f626f64792e4d41585f4445434f4d5052455353494f4e5f524154494f(), ["encoded_request_body.ZSTD_DECODE_TIMEOUT"]: rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f54494d454f5554(), ["encoded_request_body.ZSTD_DECODE_CHUNK_BYTES"]: rp_656e636f6465645f726571756573745f626f64792e5a5354445f4445434f44455f4348554e4b5f4259544553(), ["encoded_request_body.MAX_PARALLEL_ZSTD_DECODES"]: rp_656e636f6465645f726571756573745f626f64792e4d41585f504152414c4c454c5f5a5354445f4445434f444553(), ["entrypoint.STACK_BYTES"]: rp_656e747279706f696e742e535441434b5f4259544553(), ["error_log.DEFAULT_MAX_BYTES"]: rp_6572726f725f6c6f672e44454641554c545f4d41585f4259544553(), ["error_log.MAX_BODY_BYTES"]: rp_6572726f725f6c6f672e4d41585f424f44595f4259544553(), ["error_log.MAX_DOCUMENT_BYTES"]: rp_6572726f725f6c6f672e4d41585f444f43554d454e545f4259544553(), ["gemini.PROJECT_ENV"]: rp_67656d696e692e50524f4a4543545f454e56(), ["gemini.MODEL_OWNER"]: rp_67656d696e692e4d4f44454c5f4f574e4552(), ["gemini.map_finish_reason"]: rp_67656d696e692e6d61705f66696e6973685f726561736f6e, ["gemini_bridge.MODEL_ROLE"]: rp_67656d696e695f6272696467652e4d4f44454c5f524f4c45(), ["gemini_bridge.map_finish_reason"]: rp_67656d696e695f6272696467652e6d61705f66696e6973685f726561736f6e, ["git_proxy.ZERO_OID"]: rp_6769745f70726f78792e5a45524f5f4f4944(), ["git_proxy.scope_admits"]: rp_6769745f70726f78792e73636f70655f61646d697473, ["git_proxy.canonical_git_path"]: rp_6769745f70726f78792e63616e6f6e6963616c5f6769745f70617468, ["github_proxy.POLICY_HEADER"]: rp_6769746875625f70726f78792e504f4c4943595f484541444552(), ["gonka.MISSING_API_KEY_MESSAGE"]: rp_676f6e6b612e4d495353494e475f4150495f4b45595f4d455353414745(), ["gonka.CATALOG_TTL"]: rp_676f6e6b612e434154414c4f475f54544c(), ["gonka.CATALOG_REQUEST_TIMEOUT"]: rp_676f6e6b612e434154414c4f475f524551554553545f54494d454f5554(), ["gonka.FAILED_REFRESH_RETRY"]: rp_676f6e6b612e4641494c45445f524546524553485f5245545259(), ["gonka.MAX_CATALOG_BYTES"]: rp_676f6e6b612e4d41585f434154414c4f475f4259544553(), ["gonka.MAX_SSE_CARRY_BYTES"]: rp_676f6e6b612e4d41585f5353455f43415252595f4259544553(), ["lefine.BASE_URL"]: rp_6c6566696e652e424153455f55524c(), ["lefine.MAX_CATALOG_BODY"]: rp_6c6566696e652e4d41585f434154414c4f475f424f4459(), ["lefine.unavailable"]: rp_6c6566696e652e756e617661696c61626c65, ["lino_json.ARRAY_MARKER"]: rp_6c696e6f5f6a736f6e2e41525241595f4d41524b4552(), ["lino_json.OBJECT_MARKER"]: rp_6c696e6f5f6a736f6e2e4f424a4543545f4d41524b4552(), ["lino_json.EMPTY_STRING"]: rp_6c696e6f5f6a736f6e2e454d5054595f535452494e47(), ["log_analysis.request_asks_for_a_stream"]: rp_6c6f675f616e616c797369732e726571756573745f61736b735f666f725f615f73747265616d, ["log_decode.BROTLI_BUFFER"]: rp_6c6f675f6465636f64652e42524f544c495f425546464552(), ["login.SUCCESS_MARKERS"]: rp_6c6f67696e2e535543434553535f4d41524b455253(), ["login.FAILURE_MARKERS"]: rp_6c6f67696e2e4641494c5552455f4d41524b455253(), ["login.THEME_PICKER_MARKER"]: rp_6c6f67696e2e5448454d455f5049434b45525f4d41524b4552(), ["login.WORKSPACE_TRUST_MARKER"]: rp_6c6f67696e2e574f524b53504143455f54525553545f4d41524b4552(), ["login.LOGIN_METHOD_MARKER"]: rp_6c6f67696e2e4c4f47494e5f4d4554484f445f4d41524b4552(), ["login.READY_PROMPT_MARKER"]: rp_6c6f67696e2e52454144595f50524f4d50545f4d41524b4552(), ["login_pty.PTY_COLS"]: rp_6c6f67696e5f7074792e5054595f434f4c53(), ["login_pty.PTY_ROWS"]: rp_6c6f67696e5f7074792e5054595f524f5753(), ["login_pty.POLL_INTERVAL"]: rp_6c6f67696e5f7074792e504f4c4c5f494e54455256414c(), ["login_pty_backend.contains_marker"]: rp_6c6f67696e5f7074795f6261636b656e642e636f6e7461696e735f6d61726b6572, ["login_url.AUTH_HOSTS"]: rp_6c6f67696e5f75726c2e415554485f484f535453(), ["login_url.TOKEN_PREFIXES"]: rp_6c6f67696e5f75726c2e544f4b454e5f5052454649584553(), ["login_url.REDACTED"]: rp_6c6f67696e5f75726c2e5245444143544544(), ["login_url.SECRET_PREFIXES"]: rp_6c6f67696e5f75726c2e5345435245545f5052454649584553(), ["managed_server.CONFIG_DIRECTORY"]: rp_6d616e616765645f7365727665722e434f4e4649475f4449524543544f5259(), ["managed_server.SERVER_CONFIG"]: rp_6d616e616765645f7365727665722e5345525645525f434f4e464947(), ["managed_server.MANAGED_STATE"]: rp_6d616e616765645f7365727665722e4d414e414745445f5354415445(), ["managed_server.MANAGED_LOCK"]: rp_6d616e616765645f7365727665722e4d414e414745445f4c4f434b(), ["managed_server.CONTAINER"]: rp_6d616e616765645f7365727665722e434f4e5441494e4552(), ["managed_server.VOLUME"]: rp_6d616e616765645f7365727665722e564f4c554d45(), ["managed_server.IMAGE"]: rp_6d616e616765645f7365727665722e494d414745(), ["managed_server.MANAGED_LABEL"]: rp_6d616e616765645f7365727665722e4d414e414745445f4c4142454c(), ["managed_server.run_lease.HEARTBEAT_INTERVAL"]: rp_6d616e616765645f7365727665722e72756e5f6c656173652e4845415254424541545f494e54455256414c(), ["managed_server.selection.TRUST_DIRECTORY"]: rp_6d616e616765645f7365727665722e73656c656374696f6e2e54525553545f4449524543544f5259(), ["model_catalog.CATALOG_TTL"]: rp_6d6f64656c5f636174616c6f672e434154414c4f475f54544c(), ["model_catalog.FETCH_TIMEOUT"]: rp_6d6f64656c5f636174616c6f672e46455443485f54494d454f5554(), ["model_catalog.PERSISTED_CATALOG_FILE"]: rp_6d6f64656c5f636174616c6f672e5045525349535445445f434154414c4f475f46494c45(), ["model_catalog.CATALOG_INVALIDATION_DIR"]: rp_6d6f64656c5f636174616c6f672e434154414c4f475f494e56414c49444154494f4e5f444952(), ["native_service.CONNECT_TIMEOUT"]: rp_6e61746976655f736572766963652e434f4e4e4543545f54494d454f5554(), ["operational_log.MAX_BYTES"]: rp_6f7065726174696f6e616c5f6c6f672e4d41585f4259544553(), ["operational_log.BACKUPS"]: rp_6f7065726174696f6e616c5f6c6f672e4241434b555053(), ["output_limit.CHARS_PER_TOKEN"]: rp_6f75747075745f6c696d69742e43484152535f5045525f544f4b454e(), ["output_limit.event_contains_assistant_content"]: rp_6f75747075745f6c696d69742e6576656e745f636f6e7461696e735f617373697374616e745f636f6e74656e74, ["pool_failover.DEFAULT_MAX_ATTEMPTS"]: rp_706f6f6c5f6661696c6f7665722e44454641554c545f4d41585f415454454d505453(), ["pool_failover.DEFAULT_BUDGET_SECS"]: rp_706f6f6c5f6661696c6f7665722e44454641554c545f4255444745545f53454353(), ["pool_failover.MAX_BUDGET_SECS"]: rp_706f6f6c5f6661696c6f7665722e4d41585f4255444745545f53454353(), ["pool_failover.classify_status"]: rp_706f6f6c5f6661696c6f7665722e636c6173736966795f737461747573, ["pool_response.MAX_ERROR_BYTES"]: rp_706f6f6c5f726573706f6e73652e4d41585f4552524f525f4259544553(), ["pool_stream_limits.MAX_EVENT_BYTES"]: rp_706f6f6c5f73747265616d5f6c696d6974732e4d41585f4556454e545f4259544553(), ["provider_proxy.PROVIDER_CATALOG_TTL"]: rp_70726f76696465725f70726f78792e50524f56494445525f434154414c4f475f54544c(), ["provider_proxy.PROVIDER_FAILED_REFRESH_RETRY"]: rp_70726f76696465725f70726f78792e50524f56494445525f4641494c45445f524546524553485f5245545259(), ["proxy.API_PREFIX"]: rp_70726f78792e4150495f505245464958(), ["proxy.REQUIRED_FORWARD_HEADERS"]: rp_70726f78792e52455155495245445f464f52574152445f48454144455253(), ["proxy.HOP_BY_HOP_HEADERS"]: rp_70726f78792e484f505f42595f484f505f48454144455253(), ["proxy.RESPONSE_CREDENTIAL_HEADERS"]: rp_70726f78792e524553504f4e53455f43524544454e5449414c5f48454144455253(), ["proxy.ACCEPTED_CREDENTIAL_CARRIERS"]: rp_70726f78792e41434345505445445f43524544454e5449414c5f4341525249455253(), ["proxy.CREDENTIAL_CARRIER_HINT"]: rp_70726f78792e43524544454e5449414c5f434152524945525f48494e54(), ["proxy.upstream_headers.DEFAULT_ANTHROPIC_VERSION"]: rp_70726f78792e757073747265616d5f686561646572732e44454641554c545f414e5448524f5049435f56455253494f4e(), ["proxy.upstream_headers.OAUTH_BETA_FLAG"]: rp_70726f78792e757073747265616d5f686561646572732e4f415554485f424554415f464c4147(), ["proxy.upstream_headers.INGRESS_NETWORK_HEADERS"]: rp_70726f78792e757073747265616d5f686561646572732e494e47524553535f4e4554574f524b5f48454144455253(), ["refresh.CLAUDE_OAUTH_USER_AGENT"]: rp_726566726573682e434c415544455f4f415554485f555345525f4147454e54(), ["refresh.ANTHROPIC_SDK_VERSION"]: rp_726566726573682e414e5448524f5049435f53444b5f56455253494f4e(), ["refresh.GEMINI_CLI_VERSION"]: rp_726566726573682e47454d494e495f434c495f56455253494f4e(), ["refresh.GOOGLE_AUTH_LIBRARY_VERSION"]: rp_726566726573682e474f4f474c455f415554485f4c4942524152595f56455253494f4e(), ["refresh.QWEN_CODE_VERSION"]: rp_726566726573682e5157454e5f434f44455f56455253494f4e(), ["refresh.GEMINI_CLIENT_ID_ENV"]: rp_726566726573682e47454d494e495f434c49454e545f49445f454e56(), ["refresh.GEMINI_CLIENT_SECRET_ENV"]: rp_726566726573682e47454d494e495f434c49454e545f5345435245545f454e56(), ["refresh.GEMINI_CLIENT_ID"]: rp_726566726573682e47454d494e495f434c49454e545f4944(), ["refresh.GEMINI_AUTH_USER_AGENT"]: rp_726566726573682e47454d494e495f415554485f555345525f4147454e54(), ["refresh.GEMINI_API_CLIENT"]: rp_726566726573682e47454d494e495f4150495f434c49454e54(), ["refresh.CLAUDE_CLIENT_ID"]: rp_726566726573682e434c415544455f434c49454e545f4944(), ["refresh.CLAUDE_TOKEN_URL"]: rp_726566726573682e434c415544455f544f4b454e5f55524c(), ["refresh_rejections.REJECTIONS_FILE_NAME"]: rp_726566726573685f72656a656374696f6e732e52454a454354494f4e535f46494c455f4e414d45(), ["request_log.LOG_FILE"]: rp_726571756573745f6c6f672e4c4f475f46494c45(), ["request_log.LEGACY_LOG_FILE"]: rp_726571756573745f6c6f672e4c45474143595f4c4f475f46494c45(), ["request_log.REDACTED"]: rp_726571756573745f6c6f672e5245444143544544(), ["request_log.UNAUTHENTICATED"]: rp_726571756573745f6c6f672e554e41555448454e54494341544544(), ["request_log.management.MAX_LOOKUP_BYTES"]: rp_726571756573745f6c6f672e6d616e6167656d656e742e4d41585f4c4f4f4b55505f4259544553(), ["request_log.redaction.BINARY_BODY_KEY"]: rp_726571756573745f6c6f672e726564616374696f6e2e42494e4152595f424f44595f4b4559(), ["request_log.stream_outcome.STREAM_END_MARKER"]: rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53545245414d5f454e445f4d41524b4552(), ["request_log.stream_outcome.stream_warrants_a_warning"]: rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e73747265616d5f77617272616e74735f615f7761726e696e67, ["request_log.stream_outcome.text_terminates_stream"]: rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e746578745f7465726d696e617465735f73747265616d, ["request_routing.MAX_RETRY_AFTER"]: rp_726571756573745f726f7574696e672e4d41585f52455452595f4146544552(), ["request_routing.bounded_retry_after"]: rp_726571756573745f726f7574696e672e626f756e6465645f72657472795f6166746572, ["response_affinity.FILE_NAME"]: rp_726573706f6e73655f616666696e6974792e46494c455f4e414d45(), ["response_affinity.DEFAULT_TTL"]: rp_726573706f6e73655f616666696e6974792e44454641554c545f54544c(), ["responses_websocket.RESPONSES_PATH"]: rp_726573706f6e7365735f776562736f636b65742e524553504f4e5345535f50415448(), ["responses_websocket.MAX_NAMED_STREAMS"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f4e414d45445f53545245414d53(), ["responses_websocket.MAX_STREAM_ID_CHARS"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f53545245414d5f49445f4348415253(), ["responses_websocket.MAX_CONNECTION_AGE"]: rp_726573706f6e7365735f776562736f636b65742e4d41585f434f4e4e454354494f4e5f414745(), ["responses_websocket.CONNECT_TIMEOUT"]: rp_726573706f6e7365735f776562736f636b65742e434f4e4e4543545f54494d454f5554(), ["responses_websocket.namespace_path"]: rp_726573706f6e7365735f776562736f636b65742e6e616d6573706163655f70617468, ["runtime.BOOTSTRAP_ADMIN_TTL_HOURS"]: rp_72756e74696d652e424f4f5453545241505f41444d494e5f54544c5f484f555253(), ["runtime.BOOTSTRAP_ADMIN_LABEL"]: rp_72756e74696d652e424f4f5453545241505f41444d494e5f4c4142454c(), ["safety_identifier.OPENAI_MAX_CHARACTERS"]: rp_7361666574795f6964656e7469666965722e4f50454e41495f4d41585f43484152414354455253(), ["security_headers.CONTENT_SECURITY_POLICY"]: rp_73656375726974795f686561646572732e434f4e54454e545f53454355524954595f504f4c494359(), ["storage.associative.TYPE"]: rp_73746f726167652e6173736f636961746976652e54595045(), ["storage.associative.TOKEN_RECORD"]: rp_73746f726167652e6173736f636961746976652e544f4b454e5f5245434f5244(), ["storage.associative.SUBTYPE"]: rp_73746f726167652e6173736f636961746976652e53554254595045(), ["storage.associative.VALUE"]: rp_73746f726167652e6173736f636961746976652e56414c5545(), ["storage.associative.STORAGE_FORMAT"]: rp_73746f726167652e6173736f636961746976652e53544f524147455f464f524d4154(), ["storage.associative.FORMAT_VERSION"]: rp_73746f726167652e6173736f636961746976652e464f524d41545f56455253494f4e(), ["storage.associative.RECORD_PREFIX"]: rp_73746f726167652e6173736f636961746976652e5245434f52445f505245464958(), ["storage.associative.STRING_TAG"]: rp_73746f726167652e6173736f636961746976652e535452494e475f544147(), ["storage.associative.EDGE_TAG"]: rp_73746f726167652e6173736f636961746976652e454447455f544147(), ["storage.associative.EMPTY_SEQUENCE"]: rp_73746f726167652e6173736f636961746976652e454d5054595f53455155454e4345(), ["storage.associative.BYTE_NODE_START"]: rp_73746f726167652e6173736f636961746976652e425954455f4e4f44455f5354415254(), ["storage.associative.SCHEMA_NODE_COUNT"]: rp_73746f726167652e6173736f636961746976652e534348454d415f4e4f44455f434f554e54(), ["stream_termination.INCOMPLETE_STREAM_MESSAGE"]: rp_73747265616d5f7465726d696e6174696f6e2e494e434f4d504c4554455f53545245414d5f4d455353414745(), ["stream_termination.MAX_SSE_CARRY_BYTES"]: rp_73747265616d5f7465726d696e6174696f6e2e4d41585f5353455f43415252595f4259544553(), ["subscription.external.ROUTER_METADATA_KEY"]: rp_737562736372697074696f6e2e65787465726e616c2e524f555445525f4d455441444154415f4b4559(), ["subscription.external.REFRESH_OWNER_KEY"]: rp_737562736372697074696f6e2e65787465726e616c2e524546524553485f4f574e45525f4b4559(), ["subscription.external.EXTERNAL_REFRESH_OWNER"]: rp_737562736372697074696f6e2e65787465726e616c2e45585445524e414c5f524546524553485f4f574e4552(), ["subscription.external.CREDENTIAL_SOURCE_KEY"]: rp_737562736372697074696f6e2e65787465726e616c2e43524544454e5449414c5f534f555243455f4b4559(), ["subscription.external.PROMOTION_RECEIPT_KEY"]: rp_737562736372697074696f6e2e65787465726e616c2e50524f4d4f54494f4e5f524543454950545f4b4559(), ["subscription_proxy.CODEX_RESPONSES_LITE_HEADER"]: rp_737562736372697074696f6e5f70726f78792e434f4445585f524553504f4e5345535f4c4954455f484541444552(), ["subscription_usage.SCHEMA_VERSION"]: rp_737562736372697074696f6e5f75736167652e534348454d415f56455253494f4e(), ["subscription_usage.MAX_USAGE_BODY"]: rp_737562736372697074696f6e5f75736167652e4d41585f55534147455f424f4459(), ["telegram.POLL_TIMEOUT_SECS"]: rp_74656c656772616d2e504f4c4c5f54494d454f55545f53454353(), ["telegram.ERROR_BACKOFF"]: rp_74656c656772616d2e4552524f525f4241434b4f4646(), ["telegram.ALLOWED_UPDATES"]: rp_74656c656772616d2e414c4c4f5745445f55504441544553(), ["telegram.update_id"]: rp_74656c656772616d2e7570646174655f6964, ["thinking.anthropic.CLAUDE_DEFAULT_MAX_TOKENS"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f44454641554c545f4d41585f544f4b454e53(), ["thinking.anthropic.CLAUDE_MIN_THINKING_BUDGET"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4d494e5f5448494e4b494e475f425544474554(), ["thinking.anthropic.CLAUDE_OUTPUT_HEADROOM"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4f55545055545f48454144524f4f4d(), ["thinking.anthropic.CLAUDE_OUTPUT_FLOOR"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4f55545055545f464c4f4f52(), ["thinking.anthropic.CLAUDE_FIXED_TOKEN_CEILING"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f46495845445f544f4b454e5f4345494c494e47(), ["thinking.anthropic.CLAUDE_ADAPTIVE_TOKEN_CEILING"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f41444150544956455f544f4b454e5f4345494c494e47(), ["thinking.anthropic.reasoning_budget"]: rp_7468696e6b696e672e616e7468726f7069632e726561736f6e696e675f627564676574, ["thinking.anthropic.adaptive_effort"]: rp_7468696e6b696e672e616e7468726f7069632e61646170746976655f6566666f7274, ["thinking.policy.keys"]: rp_7468696e6b696e672e706f6c6963792e6b657973, ["tls.GENERATED_DIRECTORY"]: rp_746c732e47454e4552415445445f4449524543544f5259(), ["tls.GENERATED_CERT"]: rp_746c732e47454e4552415445445f43455254(), ["tls.GENERATED_KEY"]: rp_746c732e47454e4552415445445f4b4559(), ["token.TOKEN_PREFIX"]: rp_746f6b656e2e544f4b454e5f505245464958(), ["token.CODEX_TOKEN_PREFIX"]: rp_746f6b656e2e434f4445585f544f4b454e5f505245464958(), ["token.ADMIN_SCOPE"]: rp_746f6b656e2e41444d494e5f53434f5045(), ["token_import.BACKUP_DIRECTORY"]: rp_746f6b656e5f696d706f72742e4241434b55505f4449524543544f5259(), ["token_reservation.CHARS_PER_TOKEN"]: rp_746f6b656e5f7265736572766174696f6e2e43484152535f5045525f544f4b454e(), ["token_reservation.DEFAULT_MAX_OUTPUT_TOKENS"]: rp_746f6b656e5f7265736572766174696f6e2e44454641554c545f4d41585f4f55545055545f544f4b454e53(), ["token_reservation.declared_output_tokens"]: rp_746f6b656e5f7265736572766174696f6e2e6465636c617265645f6f75747075745f746f6b656e73, ["token_secret.SENTINEL"]: rp_746f6b656e5f7365637265742e53454e54494e454c(), ["token_secret.refusal"]: rp_746f6b656e5f7365637265742e7265667573616c, ["token_secret.FILE_ENV"]: rp_746f6b656e5f7365637265742e46494c455f454e56(), ["verification.SCHEMA"]: rp_766572696669636174696f6e2e534348454d41(), ["verification.SKIP_LOG"]: rp_766572696669636174696f6e2e534b49505f4c4f47(), ["tunnel_command.TOKEN_ENV"]: rp_74756e6e656c5f636f6d6d616e642e544f4b454e5f454e56(), ["tunnel_command.DEFAULT_IMAGE"]: rp_74756e6e656c5f636f6d6d616e642e44454641554c545f494d414745(), ["tunnel_command.SUPERVISOR"]: rp_74756e6e656c5f636f6d6d616e642e53555045525649534f52(), ["upstream_client.DEFAULT_UPSTREAM_READ_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353(), ["upstream_client.DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f434f4e4e4543545f54494d454f55545f53454353(), ["upstream_client.DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f46495253545f425954455f54494d454f55545f53454353(), ["upstream_client.parse_timeout_secs"]: rp_757073747265616d5f636c69656e742e70617273655f74696d656f75745f73656373, ["upstream_client.parse_upstream_read_timeout"]: rp_757073747265616d5f636c69656e742e70617273655f757073747265616d5f726561645f74696d656f7574, ["upstream_guard.ALLOW_PRIVATE_NETWORKS_ENV"]: rp_757073747265616d5f67756172642e414c4c4f575f505249564154455f4e4554574f524b535f454e56(), ["upstream_guard.METADATA_NAMES"]: rp_757073747265616d5f67756172642e4d455441444154415f4e414d4553(), ["usage.ESTIMATED_CHARS_PER_TOKEN"]: rp_75736167652e455354494d415445445f43484152535f5045525f544f4b454e(), ["vendor_cli_refresh.DEFAULT_TIMEOUT"]: rp_76656e646f725f636c695f726566726573682e44454641554c545f54494d454f5554(), ["vendor_cli_refresh.CLAUDE_PROBE"]: rp_76656e646f725f636c695f726566726573682e434c415544455f50524f4245(), ["vendor_cli_refresh.CODEX_PROBE"]: rp_76656e646f725f636c695f726566726573682e434f4445585f50524f4245(), ["vendor_cli_refresh.PROBE_ARGS_ENV"]: rp_76656e646f725f636c695f726566726573682e50524f42455f415247535f454e56(), ["verification_client.safety_for"]: rp_766572696669636174696f6e5f636c69656e742e7361666574795f666f72, ["verification_client.CLIENTS"]: rp_766572696669636174696f6e5f636c69656e742e434c49454e5453(), ["vk.API_VERSION"]: rp_766b2e4150495f56455253494f4e(), ["vk.WAIT_SECS"]: rp_766b2e574149545f53454353(), ["vk.ERROR_BACKOFF"]: rp_766b2e4552524f525f4241434b4f4646(), ["vk.CHAT_PEER_OFFSET"]: rp_766b2e434841545f504545525f4f4646534554(), ["vk.is_private"]: rp_766b2e69735f70726976617465, ["warmup.WARMUP_TEXT"]: rp_7761726d75702e5741524d55505f54455854(), ["zai_coding_plan.ANTHROPIC_BASE_PATH"]: rp_7a61695f636f64696e675f706c616e2e414e5448524f5049435f424153455f50415448(), ["zai_coding_plan.CHAT_BASE_PATH"]: rp_7a61695f636f64696e675f706c616e2e434841545f424153455f50415448(), ["zai_coding_plan.RESPONSES_BASE_PATH"]: rp_7a61695f636f64696e675f706c616e2e524553504f4e5345535f424153455f50415448(), ["zai_coding_plan.HEALTH_PATH"]: rp_7a61695f636f64696e675f706c616e2e4845414c54485f50415448(), ["zai_coding_plan.CATALOG_PATH"]: rp_7a61695f636f64696e675f706c616e2e434154414c4f475f50415448(), ["zai_coding_plan.CATALOG_TTL"]: rp_7a61695f636f64696e675f706c616e2e434154414c4f475f54544c(), ["zai_coding_plan.FAILED_REFRESH_RETRY"]: rp_7a61695f636f64696e675f706c616e2e4641494c45445f524546524553485f5245545259(), ["zai_coding_plan.MAX_CATALOG_BODY"]: rp_7a61695f636f64696e675f706c616e2e4d41585f434154414c4f475f424f4459(), ["zai_upstream_error.EXHAUSTED_CODES"]: rp_7a61695f757073747265616d5f6572726f722e4558484155535445445f434f444553(), ["zai_upstream_error.MAX_CLASSIFIED_BODY"]: rp_7a61695f757073747265616d5f6572726f722e4d41585f434c41535349464945445f424f4459(), ["zai_upstream_error.STATE_FILE"]: rp_7a61695f757073747265616d5f6572726f722e53544154455f46494c45(), ["anthropic_nonstream.MAX_BUFFERED_RESPONSE"]: rp_616e7468726f7069635f6e6f6e73747265616d2e4d41585f42554646455245445f524553504f4e5345(), ["deploy_local.SPEC_VERSION"]: rp_6465706c6f795f6c6f63616c2e535045435f56455253494f4e(), ["deploy_local.claude_share.CREDENTIAL_FILE"]: rp_6465706c6f795f6c6f63616c2e636c617564655f73686172652e43524544454e5449414c5f46494c45(), ["deploy_local.claude_share.LABEL_SUFFIX"]: rp_6465706c6f795f6c6f63616c2e636c617564655f73686172652e4c4142454c5f535546464958(), ["deploy_local.data_backup.DEADLINE"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e444541444c494e45(), ["deploy_local.data_backup.SCHEMA"]: rp_6465706c6f795f6c6f63616c2e646174615f6261636b75702e534348454d41(), ["deploy_local.host.ROLLBACK_COMMAND"]: rp_6465706c6f795f6c6f63616c2e686f73742e524f4c4c4241434b5f434f4d4d414e44(), ["deploy_local.preservation.CATALOG_ENV"]: rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f454e56(), ["deploy_local.preservation.CATALOG_SCRIPT"]: rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f534352495054(), ["deploy_local.runtime_env.LABEL_SUFFIX"]: rp_6465706c6f795f6c6f63616c2e72756e74696d655f656e762e4c4142454c5f535546464958(), ["deploy_local.secret.LABEL_SUFFIX"]: rp_6465706c6f795f6c6f63616c2e7365637265742e4c4142454c5f535546464958(), ["deploy_local.secret.PROBE_ENV"]: rp_6465706c6f795f6c6f63616c2e7365637265742e50524f42455f454e56(), ["deploy_local.secret.PROBE_SCRIPT"]: rp_6465706c6f795f6c6f63616c2e7365637265742e50524f42455f534352495054(), ["deploy_local.secret.probe_accepted"]: rp_6465706c6f795f6c6f63616c2e7365637265742e70726f62655f6163636570746564, ["deploy_local.service.MANAGER_ENV"]: rp_6465706c6f795f6c6f63616c2e736572766963652e4d414e414745525f454e56(), ["deploy_local.service.RECORD"]: rp_6465706c6f795f6c6f63616c2e736572766963652e5245434f5244(), ["deploy_local.service.SECRET"]: rp_6465706c6f795f6c6f63616c2e736572766963652e534543524554(), ["deploy_local.staging.LABEL"]: rp_6465706c6f795f6c6f63616c2e73746167696e672e4c4142454c(), ["deploy_local.staging.MARKER"]: rp_6465706c6f795f6c6f63616c2e73746167696e672e4d41524b4552(), ["deploy_remote.AGENT_LEASE_EXIT"]: rp_6465706c6f795f72656d6f74652e4147454e545f4c454153455f45584954(), ["deploy_remote.TRANSPORT_EXIT"]: rp_6465706c6f795f72656d6f74652e5452414e53504f52545f45584954(), ["deploy_remote.LEASE_EXIT"]: rp_6465706c6f795f72656d6f74652e4c454153455f45584954(), ["deploy_remote.session.DEADLINE_EXIT"]: rp_6465706c6f795f72656d6f74652e73657373696f6e2e444541444c494e455f45584954(), ["deploy_remote.session.EVENT_PREFIX"]: rp_6465706c6f795f72656d6f74652e73657373696f6e2e4556454e545f505245464958(), ["logs_cli.SHOWN"]: rp_6c6f67735f636c692e53484f574e(), ["account_policy_dispatch.MAX_ERROR_BYTES"]: rp_6163636f756e745f706f6c6963795f64697370617463682e4d41585f4552524f525f4259544553(), ["account_policy_response.MAX_RESPONSE_BYTES"]: rp_6163636f756e745f706f6c6963795f726573706f6e73652e4d41585f524553504f4e53455f4259544553(), ["account_policy_response.MAX_EVENT_BYTES"]: rp_6163636f756e745f706f6c6963795f726573706f6e73652e4d41585f4556454e545f4259544553(), ["account_routing_policy.POLICY_FILE"]: rp_6163636f756e745f726f7574696e675f706f6c6963792e504f4c4943595f46494c45(), ["account_routing_policy.COPY_HEADER_ALLOW_LIST"]: rp_6163636f756e745f726f7574696e675f706f6c6963792e434f50595f4845414445525f414c4c4f575f4c495354(), ["management_access.SNAPSHOT"]: rp_6d616e6167656d656e745f6163636573732e534e415053484f54() });
export const provenance = {"entry":"src/lib.rs","runtimeParity":false,"moduleCount":299,"executableFunctions":40,"executableConstants":355};
