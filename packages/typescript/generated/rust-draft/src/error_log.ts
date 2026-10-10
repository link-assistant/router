// Generated draft from src/error_log.rs; sha256=254089f39473a56eb894ac8334c453e00f818449d1b65c9a598094047ef93ea4
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: any, min: any, max: any, message: any) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function DEFAULT_MAX_BYTES() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_BODY_BYTES() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_DOCUMENT_BYTES() {
  return ml_fixed((ml_fixed((8n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "DEFAULT_MAX_BYTES": bigint; "MAX_BODY_BYTES": bigint; "MAX_DOCUMENT_BYTES": bigint } = { "DEFAULT_MAX_BYTES": DEFAULT_MAX_BYTES(), "MAX_BODY_BYTES": MAX_BODY_BYTES(), "MAX_DOCUMENT_BYTES": MAX_DOCUMENT_BYTES() };
export const provenance = {"sourcePath":"src/error_log.rs","sourceSha256":"254089f39473a56eb894ac8334c453e00f818449d1b65c9a598094047ef93ea4","executable":3,"carried":13,"preserved":17,"runtimeParity":false};
