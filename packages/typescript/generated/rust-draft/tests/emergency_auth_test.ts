// Generated draft from tests/emergency_auth_test.rs; sha256=59e899de3de71eea5b9bee1967e244251c1219b8eebcdd30a0c8fef465e19a8a
// Carried constructs are data, never runtime parity evidence.
function SECRET() {
  return "emergency-test-secret";
}

function ADMIN_KEY() {
  return "emergency-admin-key";
}

function CLIENT_ROUTE() {
  return "/api/models";
}

function CLAUDE_USER_AGENT() {
  return "claude-cli/2.0.0 (external, cli)";
}

export const translated: { "SECRET": string; "ADMIN_KEY": string; "CLIENT_ROUTE": string; "CLAUDE_USER_AGENT": string } = { "SECRET": SECRET(), "ADMIN_KEY": ADMIN_KEY(), "CLIENT_ROUTE": CLIENT_ROUTE(), "CLAUDE_USER_AGENT": CLAUDE_USER_AGENT() };
export const provenance = {"sourcePath":"tests/emergency_auth_test.rs","sourceSha256":"59e899de3de71eea5b9bee1967e244251c1219b8eebcdd30a0c8fef465e19a8a","executable":4,"carried":40,"preserved":45,"runtimeParity":false};
