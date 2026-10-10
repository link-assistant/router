// Generated draft from src/account_http.rs; sha256=876e7e38985d93f896c9d191f9d7591abb66697f93504a202d4fd208217bdd09
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS() {
  return 90n;
}

function DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS() {
  return 300n;
}

function non_empty(value: string, what: string) {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof what === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(what))) throw new TypeError('argument outside supported Rust value domain');
  const value_2 = (value).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
  if ((value_2.length === 0)) {
    return Object.freeze({ $: 'Err', field0: (what + " needs a value") });
  } else {
    return Object.freeze({ $: 'Ok', field0: value_2 });
  }
}

export const translated: { "DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS": bigint; "DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS": bigint; "non_empty": (value: string, what: string) => Readonly<{ $: "Ok"; field0: string }> | Readonly<{ $: "Err"; field0: string }> } = { "DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS": DEFAULT_ACCOUNT_POOL_IDLE_TIMEOUT_SECS(), "DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS": DEFAULT_ACCOUNT_CONNECTION_MAX_AGE_SECS(), non_empty };
export const provenance = {"sourcePath":"src/account_http.rs","sourceSha256":"876e7e38985d93f896c9d191f9d7591abb66697f93504a202d4fd208217bdd09","executable":3,"executableFunctions":1,"executableConstants":2,"carried":26,"preserved":30,"runtimeParity":false};
