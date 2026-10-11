// Generated draft from src/codex_remote_control.rs; sha256=43cb591d410ee78d98ee810bc696c521ace0317df1536c54a8daf9b4d15d8cf0
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = {"schemaVersion":1,"types":{"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]},"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]}}};

const ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = new Map([]);

const ml_host_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = {"schemaVersion":1,"types":{"serde_json.Error":{"kind":"data","name":"serde_json.Error","ctors":[{"name":"JsonError","fields":[{"name":"category","type":{"kind":"data","name":"serde_json.error.Category"}},{"name":"line","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"column","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"message","type":{"kind":"string"}}]}]},"serde_json.error.Category":{"kind":"data","name":"serde_json.error.Category","ctors":[{"name":"Io","fields":[]},{"name":"Syntax","fields":[]},{"name":"Data","fields":[]},{"name":"Eof","fields":[]}]}}};

const ml_host_value_refinements_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = new Map([]);

import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

import { assertImmutableIterator as ml_assert_immutable_iterator } from "../runtime/iterator-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

const ml_host_value_schema_20ecc2a291bf2adeff86eca5311a94df9350e55538aaf9c9333b1dc4a9ec4ffb = {"schemaVersion":1,"types":{"rp_636f6465785f72656d6f74655f636f6e74726f6c2e456e726f6c6c6d656e744964656e74697479":{"kind":"data","name":"rp_636f6465785f72656d6f74655f636f6e74726f6c2e456e726f6c6c6d656e744964656e74697479","ctors":[{"name":"EnrollmentIdentity","fields":[{"name":"principal_id","type":{"kind":"string"}},{"name":"account_name","type":{"kind":"string"}},{"name":"server_id","type":{"kind":"string"}},{"name":"environment_id","type":{"kind":"string"}},{"name":"installation_id","type":{"kind":"string"}}]}]},"rp_636f6465785f72656d6f74655f636f6e74726f6c2e456e726f6c6c6d656e745265636f7264":{"kind":"data","name":"rp_636f6465785f72656d6f74655f636f6e74726f6c2e456e726f6c6c6d656e745265636f7264","ctors":[{"name":"EnrollmentRecord","fields":[{"name":"identity","type":{"kind":"data","name":"rp_636f6465785f72656d6f74655f636f6e74726f6c2e456e726f6c6c6d656e744964656e74697479"}},{"name":"upstream_token","type":{"kind":"string"}},{"name":"upstream_base_url","type":{"kind":"string"}},{"name":"expires_at","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_20ecc2a291bf2adeff86eca5311a94df9350e55538aaf9c9333b1dc4a9ec4ffb = new Map([]);

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e434f4e54494e554154494f4e5f505245464958() {
  return "la_rc_";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e46494c455f4e414d45() {
  return "codex-remote-control.lino";
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e53544f52455f56455253494f4e() {
  return 1n;
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e4d41585f5245434f524453() {
  return 1000n;
}

function ml_make_StoreError_Io(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"std.io.Error"}, ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe, { refinements: ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe });
  return Object.freeze({ $: 'Io', field0: field0 });
}

function ml_make_StoreError_Decode(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"serde_json.Error"}, ml_host_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46, { refinements: ml_host_value_refinements_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 });
  return Object.freeze({ $: 'Decode', field0: field0 });
}

function ml_make_StoreError_Crypto(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Crypto', field0: field0 });
}

function ml_make_StoreError_Invalid() {
  return Object.freeze({ $: 'Invalid' });
}

function ml_make_StoreError_StaleRotation() {
  return Object.freeze({ $: 'StaleRotation' });
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

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e76616c69646174655f7265636f7264(record) {
  ml_validate_rust_value(record, {"kind":"data","name":"rp_636f6465785f72656d6f74655f636f6e74726f6c2e456e726f6c6c6d656e745265636f7264"}, ml_host_value_schema_20ecc2a291bf2adeff86eca5311a94df9350e55538aaf9c9333b1dc4a9ec4ffb, { refinements: ml_host_value_refinements_20ecc2a291bf2adeff86eca5311a94df9350e55538aaf9c9333b1dc4a9ec4ffb });
  const identity = (record).identity;
  const values = ml_copy_fixed_array([(identity).principal_id, (identity).account_name, (identity).server_id, (identity).environment_id, (identity).installation_id, (record).upstream_token, (record).upstream_base_url], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":7}});
  if ((ml_router_any(ml_router_iter(ml_copy_fixed_array(values, {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":7}}), false), (value) => { return ((value.length === 0) || (BigInt(new TextEncoder().encode(value).length) > 8192n)); }) || ((record).expires_at <= 0n))) {
    return Object.freeze({ $: 'Err', field0: Object.freeze({ $: 'Invalid' }) });
  } else {
  }
  return Object.freeze({ $: 'Ok', field0: null });
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

function ml_make_Operation_WebSocket() {
  return Object.freeze({ $: 'WebSocket' });
}

function ml_make_Operation_Enroll() {
  return Object.freeze({ $: 'Enroll' });
}

function ml_make_Operation_Refresh() {
  return Object.freeze({ $: 'Refresh' });
}

function ml_make_Operation_Pair() {
  return Object.freeze({ $: 'Pair' });
}

function ml_make_Operation_PairStatus() {
  return Object.freeze({ $: 'PairStatus' });
}

function ml_make_Operation_List(environment_id) {
  if (!(typeof environment_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(environment_id))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "List", ["environment_id"]: environment_id });
}

function ml_make_Operation_Revoke(environment_id) {
  if (!(typeof environment_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(environment_id))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Revoke", ["environment_id"]: environment_id });
}

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e69735f72656d6f74655f636f6e74726f6c5f70617468(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  const ml_text_1 = path;
  const ml_text_2 = rp_636f6465785f72656d6f74655f636f6e74726f6c2e524f4f54();
  return ml_text_1.startsWith(ml_text_2);
}

export const translated = { ["CONTINUATION_PREFIX"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e434f4e54494e554154494f4e5f505245464958(), ["FILE_NAME"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e46494c455f4e414d45(), ["STORE_VERSION"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e53544f52455f56455253494f4e(), ["MAX_RECORDS"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e4d41585f5245434f524453(), ["StoreError"]: Object.freeze({ ["Io"]: ml_make_StoreError_Io, ["Decode"]: ml_make_StoreError_Decode, ["Crypto"]: ml_make_StoreError_Crypto, ["Invalid"]: ml_make_StoreError_Invalid, ["StaleRotation"]: ml_make_StoreError_StaleRotation }), ["validate_record"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e76616c69646174655f7265636f7264, ["ROOT"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e524f4f54(), ["SERVER"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e534552564552(), ["ENROLL"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e454e524f4c4c(), ["REFRESH"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e52454652455348(), ["REFRESH_UPSTREAM"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e524546524553485f555053545245414d(), ["PAIR"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e50414952(), ["PAIR_STATUS"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e504149525f535441545553(), ["ENVIRONMENTS"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e454e5649524f4e4d454e5453(), ["Operation"]: Object.freeze({ ["WebSocket"]: ml_make_Operation_WebSocket, ["Enroll"]: ml_make_Operation_Enroll, ["Refresh"]: ml_make_Operation_Refresh, ["Pair"]: ml_make_Operation_Pair, ["PairStatus"]: ml_make_Operation_PairStatus, ["List"]: ml_make_Operation_List, ["Revoke"]: ml_make_Operation_Revoke }), ["is_remote_control_path"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e69735f72656d6f74655f636f6e74726f6c5f70617468 };
export const provenance = {"sourcePath":"src/codex_remote_control.rs","sourceSha256":"43cb591d410ee78d98ee810bc696c521ace0317df1536c54a8daf9b4d15d8cf0","executable":16,"executableFunctions":2,"executableConstants":12,"executableTypes":2,"executableConstructors":12,"carried":55,"preserved":72,"runtimeParity":false};
