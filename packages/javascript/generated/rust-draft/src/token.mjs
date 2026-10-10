// Generated draft from src/token.rs; sha256=7ca5ba2669621a395ddf9f9fbc3ce32c9c033be6fc8acea5b6ec264c233e53be
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function TOKEN_PREFIX() {
  return "la_sk_";
}

function CODEX_TOKEN_PREFIX() {
  return "at-";
}

function ADMIN_SCOPE() {
  return "admin";
}

function MAX_TTL_HOURS() {
  return ml_fixed((ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow") * 10n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

export const translated = { "TOKEN_PREFIX": TOKEN_PREFIX(), "CODEX_TOKEN_PREFIX": CODEX_TOKEN_PREFIX(), "ADMIN_SCOPE": ADMIN_SCOPE(), "MAX_TTL_HOURS": MAX_TTL_HOURS() };
export const provenance = {"sourcePath":"src/token.rs","sourceSha256":"7ca5ba2669621a395ddf9f9fbc3ce32c9c033be6fc8acea5b6ec264c233e53be","executable":4,"carried":25,"preserved":30,"runtimeParity":false};
