// Generated draft from src/vk.rs; sha256=89da12f9d4e6ff191da1fef2f5a07dda7770d10b7dc88d504c23f6bc0f1bcb27
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_i64 as ml_host_serde_json_value_as_i64 } from "../runtime/json-runtime.mjs";

import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from "../runtime/csv-string-runtime.mjs";

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

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

function ml_make_LongPollServer_LongPollServer(server, key, ts) {
  if (!(typeof server === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(server))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof key === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(key))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof ts === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(ts))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "LongPollServer", ["server"]: server, ["key"]: key, ["ts"]: ts });
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

function rp_766b2e69735f70726976617465(peer_id, from_id) {
  if (typeof peer_id !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(peer_id, -9223372036854775808n, 9223372036854775807n, "i64 argument peer_id out of range");
  if (!(typeof peer_id === 'bigint' && peer_id >= -9223372036854775808n && peer_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof from_id !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(from_id, -9223372036854775808n, 9223372036854775807n, "i64 argument from_id out of range");
  if (!(typeof from_id === 'bigint' && from_id >= -9223372036854775808n && from_id <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return (((peer_id === from_id) && (from_id > 0n)) && (peer_id < rp_766b2e434841545f504545525f4f4646534554()));
}

function rp_766b2e6a736f6e5f7473(value) {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_host_option_bind(ml_host_option_map(ml_host_serde_json_value_as_str(value), (ml_standard_callback_0_0) => { return ml_csv_allocate(ml_standard_callback_0_0); }), () => { return ml_host_option_map(ml_host_serde_json_value_as_i64(value), (ts) => { return String(ts); }); }, "or_else");
}

export const translated = { ["API_VERSION"]: rp_766b2e4150495f56455253494f4e(), ["WAIT_SECS"]: rp_766b2e574149545f53454353(), ["ERROR_BACKOFF"]: rp_766b2e4552524f525f4241434b4f4646(), ["CHAT_PEER_OFFSET"]: rp_766b2e434841545f504545525f4f4646534554(), ["LongPollServer"]: ml_make_LongPollServer_LongPollServer, ["is_private"]: rp_766b2e69735f70726976617465, ["json_ts"]: rp_766b2e6a736f6e5f7473 };
export const provenance = {"sourcePath":"src/vk.rs","sourceSha256":"89da12f9d4e6ff191da1fef2f5a07dda7770d10b7dc88d504c23f6bc0f1bcb27","executable":7,"executableFunctions":2,"executableConstants":4,"executableTypes":1,"executableConstructors":1,"carried":10,"preserved":18,"runtimeParity":false};
