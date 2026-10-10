// Generated draft from src/request_log/management.rs; sha256=c10221e4eb80030a6fd47b826796478b0d2f2fcb9b1a15f54e859f7f90fd01da
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_LOOKUP_BYTES() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MAX_LOOKUP_BYTES": bigint } = { "MAX_LOOKUP_BYTES": MAX_LOOKUP_BYTES() };
export const provenance = {"sourcePath":"src/request_log/management.rs","sourceSha256":"c10221e4eb80030a6fd47b826796478b0d2f2fcb9b1a15f54e859f7f90fd01da","executable":1,"carried":8,"preserved":10,"runtimeParity":false};
