// Generated draft from src/account_policy_dispatch.rs; sha256=974d618e5cb271eb7708dbaeb62e8d6225aee82bbf34329e74f603f3eb7c39cd
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_ERROR_BYTES() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { "MAX_ERROR_BYTES": MAX_ERROR_BYTES() };
export const provenance = {"sourcePath":"src/account_policy_dispatch.rs","sourceSha256":"974d618e5cb271eb7708dbaeb62e8d6225aee82bbf34329e74f603f3eb7c39cd","executable":1,"carried":13,"preserved":15,"runtimeParity":false};
