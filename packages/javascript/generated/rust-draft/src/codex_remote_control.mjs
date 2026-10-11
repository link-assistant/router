// Generated draft from src/codex_remote_control.rs; sha256=43cb591d410ee78d98ee810bc696c521ace0317df1536c54a8daf9b4d15d8cf0
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = {"schemaVersion":1,"types":{"RouterOption_3_i32":{"kind":"data","name":"RouterOption_3_i32","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":32,"signed":true}}]}]},"std.io.Error":{"kind":"data","name":"std.io.Error","ctors":[{"name":"IoError","fields":[{"name":"kind","type":{"kind":"string"}},{"name":"message","type":{"kind":"string"}},{"name":"raw_os_error","type":{"kind":"data","name":"RouterOption_3_i32"}}]}]}}};

const ml_host_value_refinements_e49a0da85e7ce49f045fe03fa441d61a99c7ff10a47a84b74deba3ff254feafe = new Map([]);

const ml_host_value_schema_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = {"schemaVersion":1,"types":{"serde_json.Error":{"kind":"data","name":"serde_json.Error","ctors":[{"name":"JsonError","fields":[{"name":"category","type":{"kind":"data","name":"serde_json.error.Category"}},{"name":"line","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"column","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"message","type":{"kind":"string"}}]}]},"serde_json.error.Category":{"kind":"data","name":"serde_json.error.Category","ctors":[{"name":"Io","fields":[]},{"name":"Syntax","fields":[]},{"name":"Data","fields":[]},{"name":"Eof","fields":[]}]}}};

const ml_host_value_refinements_bd4e6dafd5789d745fe132717d8ecdaf27b27ccd24179091dc70f7038744fe46 = new Map([]);

function CONTINUATION_PREFIX() {
  return "la_rc_";
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
};

const serde_json = {
  error: {

  },
};

function FILE_NAME() {
  return "codex-remote-control.lino";
}

function STORE_VERSION() {
  return 1n;
}

function MAX_RECORDS() {
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

function ROOT() {
  return "/api/services/codex/backend-api/wham/remote/control/";
}

function SERVER() {
  return "/api/services/codex/backend-api/wham/remote/control/server";
}

function ENROLL() {
  return "/api/services/codex/backend-api/wham/remote/control/server/enroll";
}

function REFRESH() {
  return "/api/services/codex/backend-api/wham/remote/control/server/refresh";
}

function REFRESH_UPSTREAM() {
  return "/wham/remote/control/server/refresh";
}

function PAIR() {
  return "/api/services/codex/backend-api/wham/remote/control/server/pair";
}

function PAIR_STATUS() {
  return "/api/services/codex/backend-api/wham/remote/control/server/pair/status";
}

function ENVIRONMENTS() {
  return "/api/services/codex/backend-api/wham/remote/control/environments/";
}

function is_remote_control_path(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return path.startsWith(ROOT());
}

function uri_path_and_query(path, query) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof query === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(query))) throw new TypeError('argument outside supported Rust value domain');
  if ((query.length === 0)) {
    return path;
  } else {
    return ((path + "?") + query);
  }
}

export const translated = { ["CONTINUATION_PREFIX"]: CONTINUATION_PREFIX(), ["FILE_NAME"]: FILE_NAME(), ["STORE_VERSION"]: STORE_VERSION(), ["MAX_RECORDS"]: MAX_RECORDS(), ["StoreError"]: Object.freeze({ ["Io"]: ml_make_StoreError_Io, ["Decode"]: ml_make_StoreError_Decode, ["Crypto"]: ml_make_StoreError_Crypto, ["Invalid"]: ml_make_StoreError_Invalid, ["StaleRotation"]: ml_make_StoreError_StaleRotation }), ["ROOT"]: ROOT(), ["SERVER"]: SERVER(), ["ENROLL"]: ENROLL(), ["REFRESH"]: REFRESH(), ["REFRESH_UPSTREAM"]: REFRESH_UPSTREAM(), ["PAIR"]: PAIR(), ["PAIR_STATUS"]: PAIR_STATUS(), ["ENVIRONMENTS"]: ENVIRONMENTS(), ["is_remote_control_path"]: is_remote_control_path, ["uri_path_and_query"]: uri_path_and_query };
export const provenance = {"sourcePath":"src/codex_remote_control.rs","sourceSha256":"43cb591d410ee78d98ee810bc696c521ace0317df1536c54a8daf9b4d15d8cf0","executable":15,"executableFunctions":2,"executableConstants":12,"executableTypes":1,"executableConstructors":5,"carried":56,"preserved":72,"runtimeParity":false};
