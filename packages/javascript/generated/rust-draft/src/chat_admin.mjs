// Generated draft from src/chat_admin.rs; sha256=2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_SECRET_TTL_SECS() {
  return 120n;
}

function DEFAULT_RATE_LIMIT_PER_MINUTE() {
  return 5n;
}

function MAX_SESSIONS() {
  return 512n;
}

function ALREADY_CLAIMED() {
  return "Administration of this router is already claimed (here, through the web UI, or by deployment configuration). Send `/auth <admin token>` with an admin credential.";
}

function RATE_LIMITED() {
  return "Too many attempts. Wait a minute and try again.";
}

function HELP() {
  return "Commands:\n/status — credential state, accounts and usage\n/tokens — list issued tokens (ids, labels and limits, never values)\n/issue [label] [ttl_hours] [max_requests] [key=value …] — issue a token;\n    options: label, ttl_hours, max_requests, max_tokens,\n    rate_limit_per_minute, account\n/show <id> — every constraint, counter and state for one token\n/rotate-token <id> [key=value …] — reissue a token, keeping its limits\n/revoke <id> — revoke a token\n/rotate — replace the admin credential\n/auth <token> — sign in with an admin credential\n/logout — forget the credential bound to this chat";
}

export const translated = { "DEFAULT_SECRET_TTL_SECS": DEFAULT_SECRET_TTL_SECS(), "DEFAULT_RATE_LIMIT_PER_MINUTE": DEFAULT_RATE_LIMIT_PER_MINUTE(), "MAX_SESSIONS": MAX_SESSIONS(), "ALREADY_CLAIMED": ALREADY_CLAIMED(), "RATE_LIMITED": RATE_LIMITED(), "HELP": HELP() };
export const provenance = {"sourcePath":"src/chat_admin.rs","sourceSha256":"2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd","executable":6,"executableFunctions":0,"executableConstants":6,"carried":24,"preserved":31,"runtimeParity":false};
