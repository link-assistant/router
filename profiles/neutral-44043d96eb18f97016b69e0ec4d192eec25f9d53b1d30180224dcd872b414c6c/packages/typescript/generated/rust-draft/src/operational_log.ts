
// Generated draft from src/operational_log.rs; sha256=e9b30715348879f62de6b532a765850318885e177e19a0687f0cc4a59a12746f
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6f7065726174696f6e616c5f6c6f672e4d41585f4259544553(): bigint {
  return ml_fixed((ml_fixed((2n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6f7065726174696f6e616c5f6c6f672e4241434b555053(): bigint {
  return 4n;
}

export const translated: { "MAX_BYTES": bigint; "BACKUPS": bigint } = { ["MAX_BYTES"]: rp_6f7065726174696f6e616c5f6c6f672e4d41585f4259544553(), ["BACKUPS"]: rp_6f7065726174696f6e616c5f6c6f672e4241434b555053() };
export const provenance = {"sourcePath":"src/operational_log.rs","sourceSha256":"e9b30715348879f62de6b532a765850318885e177e19a0687f0cc4a59a12746f","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":18,"runtimeParity":false};
