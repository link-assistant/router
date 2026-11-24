
// Generated draft from rust/src/proxy.rs; sha256=f8c24bc7d6da63a9371fd19f0f540432dba7f748ba0951a9da733a610ec12df9
// Carried constructs are data, never runtime parity evidence.
function rp_70726f78792e4150495f505245464958(): string {
  return "/api/services/anthropic/";
}

function rp_70726f78792e52455155495245445f464f52574152445f48454144455253(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["anthropic-beta", "anthropic-version"]));
}

function rp_70726f78792e484f505f42595f484f505f48454144455253(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["host", "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]));
}

function rp_70726f78792e524553504f4e53455f43524544454e5449414c5f48454144455253(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["authorization", "proxy-authorization", "set-cookie", "set-cookie2", "x-api-key", "x-goog-api-key", "anthropic-auth-token"]));
}

function rp_70726f78792e41434345505445445f43524544454e5449414c5f4341525249455253(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["x-api-key", "x-goog-api-key"]));
}

function rp_70726f78792e43524544454e5449414c5f434152524945525f48494e54(): string {
  return "Missing client token. Present it as `Authorization: Bearer <token>`, `x-api-key: <token>` or `x-goog-api-key: <token>`. The `?key=` query parameter is deliberately not accepted, because a URL is recorded by proxies and server logs.";
}

export const translated: { "API_PREFIX": string; "REQUIRED_FORWARD_HEADERS": ReadonlyArray<string>; "HOP_BY_HOP_HEADERS": ReadonlyArray<string>; "RESPONSE_CREDENTIAL_HEADERS": ReadonlyArray<string>; "ACCEPTED_CREDENTIAL_CARRIERS": ReadonlyArray<string>; "CREDENTIAL_CARRIER_HINT": string } = { ["API_PREFIX"]: rp_70726f78792e4150495f505245464958(), ["REQUIRED_FORWARD_HEADERS"]: rp_70726f78792e52455155495245445f464f52574152445f48454144455253(), ["HOP_BY_HOP_HEADERS"]: rp_70726f78792e484f505f42595f484f505f48454144455253(), ["RESPONSE_CREDENTIAL_HEADERS"]: rp_70726f78792e524553504f4e53455f43524544454e5449414c5f48454144455253(), ["ACCEPTED_CREDENTIAL_CARRIERS"]: rp_70726f78792e41434345505445445f43524544454e5449414c5f4341525249455253(), ["CREDENTIAL_CARRIER_HINT"]: rp_70726f78792e43524544454e5449414c5f434152524945525f48494e54() };
export const provenance = {"sourcePath":"rust/src/proxy.rs","sourceSha256":"f8c24bc7d6da63a9371fd19f0f540432dba7f748ba0951a9da733a610ec12df9","executable":6,"executableFunctions":0,"executableConstants":6,"executableTypes":0,"executableConstructors":0,"carried":58,"preserved":65,"runtimeParity":false};
