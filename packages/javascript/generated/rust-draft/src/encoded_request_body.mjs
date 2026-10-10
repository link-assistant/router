// Generated draft from src/encoded_request_body.rs; sha256=93719eb74b1053297dc429a2eba5f12d03f09d5fd5eb3cd9653caa7641b540ce
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_DECOMPRESSION_RATIO() {
  return 200n;
}

function ZSTD_DECODE_CHUNK_BYTES() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_PARALLEL_ZSTD_DECODES() {
  return 4n;
}

export const translated = { "MAX_DECOMPRESSION_RATIO": MAX_DECOMPRESSION_RATIO(), "ZSTD_DECODE_CHUNK_BYTES": ZSTD_DECODE_CHUNK_BYTES(), "MAX_PARALLEL_ZSTD_DECODES": MAX_PARALLEL_ZSTD_DECODES() };
export const provenance = {"sourcePath":"src/encoded_request_body.rs","sourceSha256":"93719eb74b1053297dc429a2eba5f12d03f09d5fd5eb3cd9653caa7641b540ce","executable":3,"executableFunctions":0,"executableConstants":3,"carried":25,"preserved":29,"runtimeParity":false};
