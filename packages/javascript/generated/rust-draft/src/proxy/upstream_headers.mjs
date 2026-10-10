// Generated draft from src/proxy/upstream_headers.rs; sha256=4ff0d415248394ab0f70ceb7a26702a11988cdcd8be1441587a59dac5f8daa48
// Carried constructs are data, never runtime parity evidence.
function forwarded_client_headers() {
  return Object.freeze(["user-agent", "anthropic-version", "anthropic-beta", "x-stainless-*", "x-claude-code-*", "accept", "content-type"]);
}

function DEFAULT_ANTHROPIC_VERSION() {
  return "2023-06-01";
}

function OAUTH_BETA_FLAG() {
  return "oauth-2025-04-20";
}

export const translated = { forwarded_client_headers, "DEFAULT_ANTHROPIC_VERSION": DEFAULT_ANTHROPIC_VERSION(), "OAUTH_BETA_FLAG": OAUTH_BETA_FLAG() };
export const provenance = {"sourcePath":"src/proxy/upstream_headers.rs","sourceSha256":"4ff0d415248394ab0f70ceb7a26702a11988cdcd8be1441587a59dac5f8daa48","executable":3,"executableFunctions":1,"executableConstants":2,"carried":11,"preserved":15,"runtimeParity":false};
