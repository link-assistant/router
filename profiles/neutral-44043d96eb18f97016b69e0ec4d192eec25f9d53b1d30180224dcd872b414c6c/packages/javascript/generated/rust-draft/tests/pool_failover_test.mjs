// Generated draft from tests/pool_failover_test.rs; sha256=df74056a7701c52917aa9d4d54c1e582091c2e9dcf3ce0f09f3746157e06755d
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

import { std_time_duration_as_secs as ml_host_duration_as_secs } from "../runtime/time-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_36a65e6ac4e92ee4c89ac5c3a0086e1e555b2337db02fa2dc20c33948d0770ac = {"schemaVersion":1,"types":{"RouterTuple_6_string_17_rust_owned_string_rust_5b7b22736f757263654f776e657273686970223a7b226b696e64223a22626f72726f776564222c22736f75726365223a22737472227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d":{"kind":"data","name":"RouterTuple_6_string_17_rust_owned_string_rust_5b7b22736f757263654f776e657273686970223a7b226b696e64223a22626f72726f776564222c22736f75726365223a22737472227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d","ctors":[{"name":"Tuple","fields":[{"name":"field0","type":{"kind":"string"}},{"name":"field1","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_36a65e6ac4e92ee4c89ac5c3a0086e1e555b2337db02fa2dc20c33948d0770ac = new Map([]);

const ml_host_value_schema_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 = {"schemaVersion":1,"types":{"std.time.Duration":{"kind":"data","name":"std.time.Duration","ctors":[{"name":"Duration","fields":[{"name":"secs","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"nanos","type":{"kind":"fixed","bits":32,"signed":false}}]}]}}};

const ml_host_value_refinements_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 = new Map([["std.time.Duration", ml_validate_duration]]);

function ml_validate_duration(value) { ml_host_duration_as_secs(value); return true; }

function ACCOUNTS() {
  return ml_copy_fixed_array(["primary", "account-1", "account-2"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":3}});
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

function MESSAGES() {
  return "/api/services/anthropic/v1/messages";
}

function COUNT_TOKENS() {
  return "/api/services/anthropic/v1/messages/count_tokens";
}

function CODEX_RESPONSES() {
  return "/api/services/codex/v1/responses";
}

function ADMIN_KEY() {
  return "pool-admin";
}

function ml_make_Reply_Ok() {
  return Object.freeze({ $: 'Ok' });
}

function ml_make_Reply_Status(status, headers, delay) {
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(headers, {"kind":"array","element":{"kind":"data","name":"RouterTuple_6_string_17_rust_owned_string_rust_5b7b22736f757263654f776e657273686970223a7b226b696e64223a22626f72726f776564222c22736f75726365223a22737472227d7d2c7b226f776e657273686970223a226f776e6572736869702d62656172696e6720537472696e672074797065222c22736f757263654f776e657273686970223a7b226b696e64223a226f776e6564222c22736f75726365223a22537472696e67227d7d5d"}}, ml_host_value_schema_36a65e6ac4e92ee4c89ac5c3a0086e1e555b2337db02fa2dc20c33948d0770ac, { refinements: ml_host_value_refinements_36a65e6ac4e92ee4c89ac5c3a0086e1e555b2337db02fa2dc20c33948d0770ac });
  ml_validate_rust_value(delay, {"kind":"data","name":"std.time.Duration"}, ml_host_value_schema_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506, { refinements: ml_host_value_refinements_d455489a83966d4b670ddf6c3d2ae90088973fc7bd8b7c6119ab0f9f46c91506 });
  return Object.freeze({ $: "Status", ["status"]: status, ["headers"]: headers, ["delay"]: delay });
}

function ml_make_Reply_Cut(reset) {
  if (!(typeof reset === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Cut", ["reset"]: reset });
}

function ml_make_Reply_Redirect(status, location) {
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof location === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(location))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Redirect", ["status"]: status, ["location"]: location });
}

function ml_make_Reply_Recorded(status, body, reset) {
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof body === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(body))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reset === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Recorded", ["status"]: status, ["body"]: body, ["reset"]: reset });
}

function CUT_TEXT_CHARS() {
  return 400n;
}

export const translated = { ["ACCOUNTS"]: ACCOUNTS(), ["MESSAGES"]: MESSAGES(), ["COUNT_TOKENS"]: COUNT_TOKENS(), ["CODEX_RESPONSES"]: CODEX_RESPONSES(), ["ADMIN_KEY"]: ADMIN_KEY(), ["Reply"]: Object.freeze({ ["Ok"]: ml_make_Reply_Ok, ["Status"]: ml_make_Reply_Status, ["Cut"]: ml_make_Reply_Cut, ["Redirect"]: ml_make_Reply_Redirect, ["Recorded"]: ml_make_Reply_Recorded }), ["CUT_TEXT_CHARS"]: CUT_TEXT_CHARS() };
export const provenance = {"sourcePath":"tests/pool_failover_test.rs","sourceSha256":"df74056a7701c52917aa9d4d54c1e582091c2e9dcf3ce0f09f3746157e06755d","executable":7,"executableFunctions":0,"executableConstants":6,"executableTypes":1,"executableConstructors":5,"carried":54,"preserved":62,"runtimeParity":false};
