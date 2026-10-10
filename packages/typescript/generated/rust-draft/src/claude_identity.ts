// Generated draft from src/claude_identity.rs; sha256=2b27501f2374251fb0f5a265ca80562734388d861db705cfcbbe37df257f02c6
// Carried constructs are data, never runtime parity evidence.
function CLAUDE_CODE_SYSTEM_PROMPT() {
  return "You are Claude Code, Anthropic's official CLI for Claude.";
}

function DEFAULT_CLIENT_VERSION() {
  return "2.1.265";
}

function is_oauth_credential(token: string) {
  return token.startsWith("sk-ant-oat");
}

export const translated: { "CLAUDE_CODE_SYSTEM_PROMPT": string; "DEFAULT_CLIENT_VERSION": string; "is_oauth_credential": (token: string) => boolean } = { "CLAUDE_CODE_SYSTEM_PROMPT": CLAUDE_CODE_SYSTEM_PROMPT(), "DEFAULT_CLIENT_VERSION": DEFAULT_CLIENT_VERSION(), is_oauth_credential };
export const provenance = {"sourcePath":"src/claude_identity.rs","sourceSha256":"2b27501f2374251fb0f5a265ca80562734388d861db705cfcbbe37df257f02c6","executable":3,"carried":8,"preserved":12,"runtimeParity":false};
