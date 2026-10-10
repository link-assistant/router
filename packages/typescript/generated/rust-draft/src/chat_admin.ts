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

function RATE_LIMITED() {
  return "Too many attempts. Wait a minute and try again.";
}

export const translated: { "DEFAULT_SECRET_TTL_SECS": bigint; "DEFAULT_RATE_LIMIT_PER_MINUTE": bigint; "MAX_SESSIONS": bigint; "RATE_LIMITED": string } = { "DEFAULT_SECRET_TTL_SECS": DEFAULT_SECRET_TTL_SECS(), "DEFAULT_RATE_LIMIT_PER_MINUTE": DEFAULT_RATE_LIMIT_PER_MINUTE(), "MAX_SESSIONS": MAX_SESSIONS(), "RATE_LIMITED": RATE_LIMITED() };
export const provenance = {"sourcePath":"src/chat_admin.rs","sourceSha256":"2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd","executable":4,"carried":26,"preserved":31,"runtimeParity":false};
