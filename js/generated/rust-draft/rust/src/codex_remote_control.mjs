// Generated draft from rust/src/codex_remote_control.rs; sha256=8619faf794863a705cb7a8d5e57c85382ab0e3146f06f8a522447ee4e634ce9a
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_a38ae9b0f048af7d258beba7d2431eaf77d789a509a68d50bd545ce7dd14abe8 = {"schemaVersion":1,"types":{"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]},"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]}}};

const ml_constructor_value_schema_08a22c808f96f132fab128b6e1bee33f9fe335cec00369925efa5e019f8659c7 = {"schemaVersion":1,"types":{"StoreError":{"kind":"data","name":"StoreError","ctors":[{"name":"Io","fields":[{"name":"field0","type":{"kind":"data","name":"std.io.Error"}}]},{"name":"Decode","fields":[{"name":"field0","type":{"kind":"data","name":"serde_json.Error"}}]},{"name":"Crypto","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Invalid","fields":[]},{"name":"StaleRotation","fields":[]}]},"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]},"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]},"serde_json.Error":{"kind":"data","name":"serde_json.Error","ctors":[{"name":"JsonError","fields":[{"name":"category","type":{"kind":"data","name":"serde_json.error.Category"}},{"name":"line","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"column","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"message","type":{"kind":"string"}}]}]},"serde_json.error.Category":{"kind":"data","name":"serde_json.error.Category","ctors":[{"name":"Io","fields":[]},{"name":"Syntax","fields":[]},{"name":"Data","fields":[]},{"name":"Eof","fields":[]}]}}};

const ml_constructor_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = {"schemaVersion":1,"types":{"serde_json.Error":{"kind":"data","name":"serde_json.Error","ctors":[{"name":"JsonError","fields":[{"name":"category","type":{"kind":"data","name":"serde_json.error.Category"}},{"name":"line","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"column","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"message","type":{"kind":"string"}}]}]},"serde_json.error.Category":{"kind":"data","name":"serde_json.error.Category","ctors":[{"name":"Io","fields":[]},{"name":"Syntax","fields":[]},{"name":"Data","fields":[]},{"name":"Eof","fields":[]}]}}};

const ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = {"schemaVersion":1,"types":{"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]},"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]}}};

const ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = new Map([]);

const ml_host_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = {"schemaVersion":1,"types":{"serde_json.Error":{"kind":"data","name":"serde_json.Error","ctors":[{"name":"JsonError","fields":[{"name":"category","type":{"kind":"data","name":"serde_json.error.Category"}},{"name":"line","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"column","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"message","type":{"kind":"string"}}]}]},"serde_json.error.Category":{"kind":"data","name":"serde_json.error.Category","ctors":[{"name":"Io","fields":[]},{"name":"Syntax","fields":[]},{"name":"Data","fields":[]},{"name":"Eof","fields":[]}]}}};

const ml_host_value_refinements_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = new Map([]);

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

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
  ml_assert_constructor_input(field0, {"kind":"data","name":"std.io.Error"}, ml_constructor_value_schema_a38ae9b0f048af7d258beba7d2431eaf77d789a509a68d50bd545ce7dd14abe8);
  ml_validate_rust_value(field0, {"kind":"data","name":"std.io.Error"}, ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe, { refinements: ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe });
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Io', field0: field0 }), {"kind":"data","name":"StoreError"}, ml_constructor_value_schema_08a22c808f96f132fab128b6e1bee33f9fe335cec00369925efa5e019f8659c7);
}

function ml_make_StoreError_Decode(field0) {
  ml_assert_constructor_input(field0, {"kind":"data","name":"serde_json.Error"}, ml_constructor_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46);
  ml_validate_rust_value(field0, {"kind":"data","name":"serde_json.Error"}, ml_host_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46, { refinements: ml_host_value_refinements_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 });
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Decode', field0: field0 }), {"kind":"data","name":"StoreError"}, ml_constructor_value_schema_08a22c808f96f132fab128b6e1bee33f9fe335cec00369925efa5e019f8659c7);
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

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

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

function rp_636f6465785f72656d6f74655f636f6e74726f6c2e6865785f6469676974(byte) {
  if (typeof byte !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(byte, 0n, 255n, "u8 argument byte out of range");
  if (!(typeof byte === 'bigint' && byte >= 0n && byte <= 255n)) throw new TypeError('argument outside supported Rust value domain');
  const ml_ordered_match_1 = byte;
  if (((ml_ordered_match_1 >= 48n) && (ml_ordered_match_1 <= 57n))) {
    return Object.freeze({ $: 'Some', field0: ml_fixed((byte - 48n), 0n, 255n, "attempt to subtract with overflow") });
  } else {
    if (((ml_ordered_match_1 >= 97n) && (ml_ordered_match_1 <= 102n))) {
      return Object.freeze({ $: 'Some', field0: ml_fixed((ml_fixed((byte - 97n), 0n, 255n, "attempt to subtract with overflow") + 10n), 0n, 255n, "attempt to add with overflow") });
    } else {
      if (((ml_ordered_match_1 >= 65n) && (ml_ordered_match_1 <= 70n))) {
        return Object.freeze({ $: 'Some', field0: ml_fixed((ml_fixed((byte - 65n), 0n, 255n, "attempt to subtract with overflow") + 10n), 0n, 255n, "attempt to add with overflow") });
      } else {
        return Object.freeze({ $: 'None' });
      }
    }
  }
}

export const translated = { ["CONTINUATION_PREFIX"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e434f4e54494e554154494f4e5f505245464958(), ["FILE_NAME"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e46494c455f4e414d45(), ["STORE_VERSION"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e53544f52455f56455253494f4e(), ["MAX_RECORDS"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e4d41585f5245434f524453(), ["StoreError"]: Object.freeze({ ["Io"]: ml_make_StoreError_Io, ["Decode"]: ml_make_StoreError_Decode, ["Crypto"]: ml_make_StoreError_Crypto, ["Invalid"]: ml_make_StoreError_Invalid, ["StaleRotation"]: ml_make_StoreError_StaleRotation }), ["ROOT"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e524f4f54(), ["SERVER"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e534552564552(), ["ENROLL"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e454e524f4c4c(), ["REFRESH"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e52454652455348(), ["REFRESH_UPSTREAM"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e524546524553485f555053545245414d(), ["PAIR"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e50414952(), ["PAIR_STATUS"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e504149525f535441545553(), ["ENVIRONMENTS"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e454e5649524f4e4d454e5453(), ["Operation"]: Object.freeze({ ["WebSocket"]: ml_make_Operation_WebSocket, ["Enroll"]: ml_make_Operation_Enroll, ["Refresh"]: ml_make_Operation_Refresh, ["Pair"]: ml_make_Operation_Pair, ["PairStatus"]: ml_make_Operation_PairStatus, ["List"]: ml_make_Operation_List, ["Revoke"]: ml_make_Operation_Revoke }), ["is_remote_control_path"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e69735f72656d6f74655f636f6e74726f6c5f70617468, ["hex_digit"]: rp_636f6465785f72656d6f74655f636f6e74726f6c2e6865785f6469676974 };
export const provenance = {"sourcePath":"rust/src/codex_remote_control.rs","sourceSha256":"8619faf794863a705cb7a8d5e57c85382ab0e3146f06f8a522447ee4e634ce9a","executable":16,"executableFunctions":2,"executableConstants":12,"executableTypes":2,"executableConstructors":12,"carried":55,"preserved":72,"runtimeParity":false};
