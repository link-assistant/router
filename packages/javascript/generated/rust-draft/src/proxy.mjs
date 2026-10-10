// Generated draft from src/proxy.rs; sha256=f8c24bc7d6da63a9371fd19f0f540432dba7f748ba0951a9da733a610ec12df9
// Carried constructs are data, never runtime parity evidence.
function API_PREFIX() {
  return "/api/services/anthropic/";
}

function CREDENTIAL_CARRIER_HINT() {
  return "Missing client token. Present it as `Authorization: Bearer <token>`, `x-api-key: <token>` or `x-goog-api-key: <token>`. The `?key=` query parameter is deliberately not accepted, because a URL is recorded by proxies and server logs.";
}

export const translated = { "API_PREFIX": API_PREFIX(), "CREDENTIAL_CARRIER_HINT": CREDENTIAL_CARRIER_HINT() };
export const provenance = {"sourcePath":"src/proxy.rs","sourceSha256":"f8c24bc7d6da63a9371fd19f0f540432dba7f748ba0951a9da733a610ec12df9","executable":2,"executableFunctions":0,"executableConstants":2,"carried":62,"preserved":65,"runtimeParity":false};
