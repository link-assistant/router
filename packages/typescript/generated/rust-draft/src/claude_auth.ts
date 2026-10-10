// Generated draft from src/claude_auth.rs; sha256=4e28b3626da69d2444e2cc548cdd3894449520be2c2b601d9de72d19453c563c
// Carried constructs are data, never runtime parity evidence.
function CLAUDE_AUTHORIZE_URL() {
  return "https://claude.com/cai/oauth/authorize";
}

function CLAUDE_REDIRECT_URI() {
  return "https://platform.claude.com/oauth/code/callback";
}

function CLAUDE_SCOPES() {
  return "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";
}

function CLAUDE_INFERENCE_SCOPE() {
  return "user:inference";
}

function PENDING_LOGIN_FILE() {
  return ".link-assistant-router-claude-login.json";
}

export const translated: { "CLAUDE_AUTHORIZE_URL": string; "CLAUDE_REDIRECT_URI": string; "CLAUDE_SCOPES": string; "CLAUDE_INFERENCE_SCOPE": string; "PENDING_LOGIN_FILE": string } = { "CLAUDE_AUTHORIZE_URL": CLAUDE_AUTHORIZE_URL(), "CLAUDE_REDIRECT_URI": CLAUDE_REDIRECT_URI(), "CLAUDE_SCOPES": CLAUDE_SCOPES(), "CLAUDE_INFERENCE_SCOPE": CLAUDE_INFERENCE_SCOPE(), "PENDING_LOGIN_FILE": PENDING_LOGIN_FILE() };
export const provenance = {"sourcePath":"src/claude_auth.rs","sourceSha256":"4e28b3626da69d2444e2cc548cdd3894449520be2c2b601d9de72d19453c563c","executable":5,"executableFunctions":0,"executableConstants":5,"carried":21,"preserved":27,"runtimeParity":false};
