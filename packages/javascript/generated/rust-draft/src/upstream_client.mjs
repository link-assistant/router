// Generated draft from src/upstream_client.rs; sha256=ef45ff192c7fe3750f641a3e8ecb530518b482ca649676748d233703bf91cc73
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { createIntegerRuntime as ml_create_integer_runtime } from "../runtime/integer-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

const ml_host_rust_integer_parse_u64 = ml_create_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_integer_parse;

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
  if (typeof default_ !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(default_, 0n, 18446744073709551615n, "u64 argument default_ out of range");
  if (!(typeof default_ === 'bigint' && default_ >= 0n && default_ <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  const seconds = ml_router_unwrap(ml_host_option_bind(value, (value_2) => { return ml_host_result_ok(ml_host_rust_integer_parse_u64((value_2).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, ''))); }, "and_then"), default_, true);
  return ml_host_bool_then((seconds > 0n), () => { return ml_host_std_time_duration_from_secs(seconds); });
}

function rp_757073747265616d5f636c69656e742e70617273655f757073747265616d5f726561645f74696d656f7574(value) {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  return rp_757073747265616d5f636c69656e742e70617273655f74696d656f75745f73656373(value, rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353());
}

export const translated = { ["DEFAULT_UPSTREAM_READ_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353(), ["DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f434f4e4e4543545f54494d454f55545f53454353(), ["DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f46495253545f425954455f54494d454f55545f53454353(), ["parse_timeout_secs"]: rp_757073747265616d5f636c69656e742e70617273655f74696d656f75745f73656373, ["parse_upstream_read_timeout"]: rp_757073747265616d5f636c69656e742e70617273655f757073747265616d5f726561645f74696d656f7574 };
export const provenance = {"sourcePath":"src/upstream_client.rs","sourceSha256":"ef45ff192c7fe3750f641a3e8ecb530518b482ca649676748d233703bf91cc73","executable":5,"executableFunctions":2,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":24,"preserved":30,"runtimeParity":false};
