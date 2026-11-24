
// Generated draft from rust/src/request_log/management.rs; sha256=c10221e4eb80030a6fd47b826796478b0d2f2fcb9b1a15f54e859f7f90fd01da
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_726571756573745f6c6f672e6d616e6167656d656e742e4d41585f4c4f4f4b55505f4259544553(): bigint {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MAX_LOOKUP_BYTES": bigint } = { ["MAX_LOOKUP_BYTES"]: rp_726571756573745f6c6f672e6d616e6167656d656e742e4d41585f4c4f4f4b55505f4259544553() };
export const provenance = {"sourcePath":"rust/src/request_log/management.rs","sourceSha256":"c10221e4eb80030a6fd47b826796478b0d2f2fcb9b1a15f54e859f7f90fd01da","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":8,"preserved":10,"runtimeParity":false};
