// Generated draft from src/request_log.rs; sha256=659faec12e15116eb27b0c65037bb86dda6a3e64fefa87266313fee23eaf2e4d
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function LOG_FILE() {
  return "requests.lino";
}

function LEGACY_LOG_FILE() {
  return "requests.jsonl";
}

function DEFAULT_MAX_BYTES() {
  return ml_fixed((ml_fixed((100n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function DEFAULT_MAX_TOTAL_BYTES() {
  return ml_fixed((ml_fixed((ml_fixed((4n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_BUFFERED_REQUEST_BYTES() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_EAGER_REQUEST_BYTES() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function REDACTED() {
  return "[REDACTED]";
}

function UNAUTHENTICATED() {
  return "unauthenticated";
}

function TOKEN_HASH_HEX_LENGTH() {
  return 32n;
}

function REDACTED_PREFIX_LENGTH() {
  return 3n;
}

function REDACTED_SUFFIX_LENGTH() {
  return 3n;
}

function MIN_PARTIAL_REDACTION_LENGTH() {
  return 12n;
}

export const translated = { "LOG_FILE": LOG_FILE(), "LEGACY_LOG_FILE": LEGACY_LOG_FILE(), "DEFAULT_MAX_BYTES": DEFAULT_MAX_BYTES(), "DEFAULT_MAX_TOTAL_BYTES": DEFAULT_MAX_TOTAL_BYTES(), "MAX_BUFFERED_REQUEST_BYTES": MAX_BUFFERED_REQUEST_BYTES(), "MAX_EAGER_REQUEST_BYTES": MAX_EAGER_REQUEST_BYTES(), "REDACTED": REDACTED(), "UNAUTHENTICATED": UNAUTHENTICATED(), "TOKEN_HASH_HEX_LENGTH": TOKEN_HASH_HEX_LENGTH(), "REDACTED_PREFIX_LENGTH": REDACTED_PREFIX_LENGTH(), "REDACTED_SUFFIX_LENGTH": REDACTED_SUFFIX_LENGTH(), "MIN_PARTIAL_REDACTION_LENGTH": MIN_PARTIAL_REDACTION_LENGTH() };
export const provenance = {"sourcePath":"src/request_log.rs","sourceSha256":"659faec12e15116eb27b0c65037bb86dda6a3e64fefa87266313fee23eaf2e4d","executable":12,"executableFunctions":0,"executableConstants":12,"carried":51,"preserved":64,"runtimeParity":false};
