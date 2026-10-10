// Generated draft from tests/upstream_error_dialect_test.rs; sha256=cfb700da8d4d221bd8b698ee5424bd411d587757921ad692fce2cfdcc0f319c7
// Carried constructs are data, never runtime parity evidence.
function UPSTREAM_RATE_LIMIT() {
  return "{\"error\":{\"type\":\"usage_limit_reached\",\"message\":\"Synthetic limit reached\",\"plan_type\":\"example\",\"resets_at\":1893456000,\"eligible_promo\":null,\"resets_in_seconds\":3600}}";
}

export const translated = { "UPSTREAM_RATE_LIMIT": UPSTREAM_RATE_LIMIT() };
export const provenance = {"sourcePath":"tests/upstream_error_dialect_test.rs","sourceSha256":"cfb700da8d4d221bd8b698ee5424bd411d587757921ad692fce2cfdcc0f319c7","executable":1,"executableFunctions":0,"executableConstants":1,"carried":27,"preserved":29,"runtimeParity":false};
