// Generated draft from src/claude_auth.rs; sha256=4e28b3626da69d2444e2cc548cdd3894449520be2c2b601d9de72d19453c563c
// Carried constructs are data, never runtime parity evidence.
function rp_636c617564655f617574682e434c415544455f415554484f52495a455f55524c() {
  return "https://claude.com/cai/oauth/authorize";
}

function rp_636c617564655f617574682e434c415544455f52454449524543545f555249() {
  return "https://platform.claude.com/oauth/code/callback";
}

function rp_636c617564655f617574682e434c415544455f53434f504553() {
  return "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";
}

function rp_636c617564655f617574682e434c415544455f494e464552454e43455f53434f5045() {
  return "user:inference";
}

function rp_636c617564655f617574682e50454e44494e475f4c4f47494e5f46494c45() {
  return ".link-assistant-router-claude-login.json";
}

export const translated = { ["CLAUDE_AUTHORIZE_URL"]: rp_636c617564655f617574682e434c415544455f415554484f52495a455f55524c(), ["CLAUDE_REDIRECT_URI"]: rp_636c617564655f617574682e434c415544455f52454449524543545f555249(), ["CLAUDE_SCOPES"]: rp_636c617564655f617574682e434c415544455f53434f504553(), ["CLAUDE_INFERENCE_SCOPE"]: rp_636c617564655f617574682e434c415544455f494e464552454e43455f53434f5045(), ["PENDING_LOGIN_FILE"]: rp_636c617564655f617574682e50454e44494e475f4c4f47494e5f46494c45() };
export const provenance = {"sourcePath":"src/claude_auth.rs","sourceSha256":"4e28b3626da69d2444e2cc548cdd3894449520be2c2b601d9de72d19453c563c","executable":5,"executableFunctions":0,"executableConstants":5,"executableTypes":0,"executableConstructors":0,"carried":21,"preserved":27,"runtimeParity":false};
