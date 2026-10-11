// Generated draft from src/proxy.rs; sha256=f8c24bc7d6da63a9371fd19f0f540432dba7f748ba0951a9da733a610ec12df9
// Carried constructs are data, never runtime parity evidence.
function API_PREFIX() {
  return "/api/services/anthropic/";
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

function REQUIRED_FORWARD_HEADERS() {
  return Object.freeze(["anthropic-beta", "anthropic-version"]);
}

function HOP_BY_HOP_HEADERS() {
  return Object.freeze(["host", "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
}

function RESPONSE_CREDENTIAL_HEADERS() {
  return Object.freeze(["authorization", "proxy-authorization", "set-cookie", "set-cookie2", "x-api-key", "x-goog-api-key", "anthropic-auth-token"]);
}

function ACCEPTED_CREDENTIAL_CARRIERS() {
  return Object.freeze(["x-api-key", "x-goog-api-key"]);
}

function CREDENTIAL_CARRIER_HINT() {
  return "Missing client token. Present it as `Authorization: Bearer <token>`, `x-api-key: <token>` or `x-goog-api-key: <token>`. The `?key=` query parameter is deliberately not accepted, because a URL is recorded by proxies and server logs.";
}

export const translated = { ["API_PREFIX"]: API_PREFIX(), ["REQUIRED_FORWARD_HEADERS"]: REQUIRED_FORWARD_HEADERS(), ["HOP_BY_HOP_HEADERS"]: HOP_BY_HOP_HEADERS(), ["RESPONSE_CREDENTIAL_HEADERS"]: RESPONSE_CREDENTIAL_HEADERS(), ["ACCEPTED_CREDENTIAL_CARRIERS"]: ACCEPTED_CREDENTIAL_CARRIERS(), ["CREDENTIAL_CARRIER_HINT"]: CREDENTIAL_CARRIER_HINT() };
export const provenance = {"sourcePath":"src/proxy.rs","sourceSha256":"f8c24bc7d6da63a9371fd19f0f540432dba7f748ba0951a9da733a610ec12df9","executable":6,"executableFunctions":0,"executableConstants":6,"executableTypes":0,"executableConstructors":0,"carried":58,"preserved":65,"runtimeParity":false};
