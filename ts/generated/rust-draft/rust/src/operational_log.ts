
// Generated draft from rust/src/operational_log.rs; sha256=8bdefb346f811b5a5755bd6da7122ea17739c6842d08018b2f01c73f6d8d71d2
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
export const provenance = {"sourcePath":"rust/src/operational_log.rs","sourceSha256":"8bdefb346f811b5a5755bd6da7122ea17739c6842d08018b2f01c73f6d8d71d2","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":18,"runtimeParity":false};
