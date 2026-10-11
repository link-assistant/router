// Generated draft from src/oauth.rs; sha256=c0461d7898c3ce3469387c732d2efacd785cdee7295276dc67f85be18ddb38ba
// Carried constructs are data, never runtime parity evidence.
function ml_make_OAuthError_NoCredentials(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'NoCredentials', field0: field0 });
}

function ml_make_OAuthError_ReadError(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'ReadError', field0: field0 });
}

function ml_make_OAuthError_ParseError(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'ParseError', field0: field0 });
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

export const translated = { ["OAuthError"]: Object.freeze({ ["NoCredentials"]: ml_make_OAuthError_NoCredentials, ["ReadError"]: ml_make_OAuthError_ReadError, ["ParseError"]: ml_make_OAuthError_ParseError }) };
export const provenance = {"sourcePath":"src/oauth.rs","sourceSha256":"c0461d7898c3ce3469387c732d2efacd785cdee7295276dc67f85be18ddb38ba","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":12,"preserved":14,"runtimeParity":false};
