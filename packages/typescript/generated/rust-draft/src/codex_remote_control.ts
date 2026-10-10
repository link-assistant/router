// Generated draft from src/codex_remote_control.rs; sha256=43cb591d410ee78d98ee810bc696c521ace0317df1536c54a8daf9b4d15d8cf0
// Carried constructs are data, never runtime parity evidence.
function CONTINUATION_PREFIX() {
  return "la_rc_";
}

function FILE_NAME() {
  return "codex-remote-control.lino";
}

function STORE_VERSION() {
  return 1n;
}

function MAX_RECORDS() {
  return 1000n;
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

function is_remote_control_path(path: string) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return path.startsWith(ROOT());
}

function uri_path_and_query(path: string, query: string) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof query === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(query))) throw new TypeError('argument outside supported Rust value domain');
  if ((query.length === 0)) {
    return path;
  } else {
    return ((path + "?") + query);
  }
}

export const translated: { "CONTINUATION_PREFIX": string; "FILE_NAME": string; "STORE_VERSION": bigint; "MAX_RECORDS": bigint; "ROOT": string; "SERVER": string; "ENROLL": string; "REFRESH": string; "REFRESH_UPSTREAM": string; "PAIR": string; "PAIR_STATUS": string; "ENVIRONMENTS": string; "is_remote_control_path": (path: string) => boolean; "uri_path_and_query": (path: string, query: string) => string } = { "CONTINUATION_PREFIX": CONTINUATION_PREFIX(), "FILE_NAME": FILE_NAME(), "STORE_VERSION": STORE_VERSION(), "MAX_RECORDS": MAX_RECORDS(), "ROOT": ROOT(), "SERVER": SERVER(), "ENROLL": ENROLL(), "REFRESH": REFRESH(), "REFRESH_UPSTREAM": REFRESH_UPSTREAM(), "PAIR": PAIR(), "PAIR_STATUS": PAIR_STATUS(), "ENVIRONMENTS": ENVIRONMENTS(), is_remote_control_path, uri_path_and_query };
export const provenance = {"sourcePath":"src/codex_remote_control.rs","sourceSha256":"43cb591d410ee78d98ee810bc696c521ace0317df1536c54a8daf9b4d15d8cf0","executable":14,"executableFunctions":2,"executableConstants":12,"carried":57,"preserved":72,"runtimeParity":false};
