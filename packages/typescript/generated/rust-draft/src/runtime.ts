// Generated draft from src/runtime.rs; sha256=fd15ba6130a241b55808aff7c3107c9e9687587715ea9ad7cf358f5362f1a52f
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function BOOTSTRAP_ADMIN_TTL_HOURS() {
  return ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function BOOTSTRAP_ADMIN_LABEL() {
  return "bootstrap-admin";
}

export const translated: { "BOOTSTRAP_ADMIN_TTL_HOURS": bigint; "BOOTSTRAP_ADMIN_LABEL": string } = { "BOOTSTRAP_ADMIN_TTL_HOURS": BOOTSTRAP_ADMIN_TTL_HOURS(), "BOOTSTRAP_ADMIN_LABEL": BOOTSTRAP_ADMIN_LABEL() };
export const provenance = {"sourcePath":"src/runtime.rs","sourceSha256":"fd15ba6130a241b55808aff7c3107c9e9687587715ea9ad7cf358f5362f1a52f","executable":2,"carried":30,"preserved":33,"runtimeParity":false};
