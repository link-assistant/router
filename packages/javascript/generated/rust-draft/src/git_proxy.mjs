// Generated draft from src/git_proxy.rs; sha256=ed47b0f287dcf7cc1d03672ed1abd924bebb5862929af06f714ccdff42409f22
// Carried constructs are data, never runtime parity evidence.
function ml_router_strip(value, search, suffix) {
  const matches = suffix ? value.endsWith(search) : value.startsWith(search);
  if (!matches) return Object.freeze({ $: 'None' });
  const text = suffix ? value.slice(0, value.length - search.length) : value.slice(search.length);
  return Object.freeze({ $: 'Some', field0: text });
}

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

function ZERO_OID() {
  return "0000000000000000000000000000000000000000";
}

function canonical_git_path(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_unwrap(ml_router_strip(path, "/api/services/github", false), path, true);
}

export const translated = { "ZERO_OID": ZERO_OID(), canonical_git_path };
export const provenance = {"sourcePath":"src/git_proxy.rs","sourceSha256":"ed47b0f287dcf7cc1d03672ed1abd924bebb5862929af06f714ccdff42409f22","executable":2,"executableFunctions":1,"executableConstants":1,"carried":27,"preserved":30,"runtimeParity":false};
