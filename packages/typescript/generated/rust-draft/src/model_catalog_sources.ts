// Generated draft from src/model_catalog_sources.rs; sha256=8737b379eadfcecd2cae09e3c2036d5ef89ff25aed5ae12d3d14d6ad3061c83a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_DOCUMENT_BYTES() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_MODELS() {
  return 4096n;
}

export const translated: { "MAX_DOCUMENT_BYTES": bigint; "MAX_MODELS": bigint } = { "MAX_DOCUMENT_BYTES": MAX_DOCUMENT_BYTES(), "MAX_MODELS": MAX_MODELS() };
export const provenance = {"sourcePath":"src/model_catalog_sources.rs","sourceSha256":"8737b379eadfcecd2cae09e3c2036d5ef89ff25aed5ae12d3d14d6ad3061c83a","executable":2,"executableFunctions":0,"executableConstants":2,"carried":24,"preserved":27,"runtimeParity":false};
