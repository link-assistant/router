// Generated draft from src/account_http.rs; sha256=876e7e38985d93f896c9d191f9d7591abb66697f93504a202d4fd208217bdd09
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS() {
  return 90n;
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

function DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS() {
  return 300n;
}

function PROXY_SCHEMES() {
  return Object.freeze(["http", "https", "socks5", "socks5h"]);
}

function non_empty(value, what) {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof what === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(what))) throw new TypeError('argument outside supported Rust value domain');
  const value_2 = (value).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
  if ((value_2.length === 0)) {
    return Object.freeze({ $: 'Err', field0: (what + " needs a value") });
  } else {
    return Object.freeze({ $: 'Ok', field0: value_2 });
  }
}

function ml_make_CookieMode_None() {
  return Object.freeze({ $: 'None' });
}

function ml_make_CookieMode_CodexCloudflare() {
  return Object.freeze({ $: 'CodexCloudflare' });
}

export const translated = { ["DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS"]: DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS(), ["DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS"]: DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS(), ["PROXY_SCHEMES"]: PROXY_SCHEMES(), ["non_empty"]: non_empty, ["CookieMode"]: Object.freeze({ ["None"]: ml_make_CookieMode_None, ["CodexCloudflare"]: ml_make_CookieMode_CodexCloudflare }) };
export const provenance = {"sourcePath":"src/account_http.rs","sourceSha256":"876e7e38985d93f896c9d191f9d7591abb66697f93504a202d4fd208217bdd09","executable":5,"executableFunctions":1,"executableConstants":3,"executableTypes":1,"executableConstructors":2,"carried":24,"preserved":30,"runtimeParity":false};
