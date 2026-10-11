// Generated draft from src/token.rs; sha256=7ca5ba2669621a395ddf9f9fbc3ce32c9c033be6fc8acea5b6ec264c233e53be
// Carried constructs are data, never runtime parity evidence.
function ml_router_strip(value, search, suffix) {
  const matches = suffix ? value.endsWith(search) : value.startsWith(search);
  if (!matches) return Object.freeze({ $: 'None' });
  const text = suffix ? value.slice(0, value.length - search.length) : value.slice(search.length);
  return Object.freeze({ $: 'Some', field0: text });
}

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function TOKEN_PREFIX() {
  return "la_sk_";
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

function CODEX_TOKEN_PREFIX() {
  return "at-";
}

function token_jwt(token) {
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  return ml_host_option_bind(ml_router_strip(token, TOKEN_PREFIX(), false), () => { return ml_router_strip(token, CODEX_TOKEN_PREFIX(), false); }, "or_else");
}

function ADMIN_SCOPE() {
  return "admin";
}

function MAX_TTL_HOURS() {
  return ml_fixed((ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow") * 10n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

export const translated = { ["TOKEN_PREFIX"]: TOKEN_PREFIX(), ["CODEX_TOKEN_PREFIX"]: CODEX_TOKEN_PREFIX(), ["token_jwt"]: token_jwt, ["ADMIN_SCOPE"]: ADMIN_SCOPE(), ["MAX_TTL_HOURS"]: MAX_TTL_HOURS() };
export const provenance = {"sourcePath":"src/token.rs","sourceSha256":"7ca5ba2669621a395ddf9f9fbc3ce32c9c033be6fc8acea5b6ec264c233e53be","executable":5,"executableFunctions":1,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":24,"preserved":30,"runtimeParity":false};
