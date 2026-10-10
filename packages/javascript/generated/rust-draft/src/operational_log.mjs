// Generated draft from src/operational_log.rs; sha256=e9b30715348879f62de6b532a765850318885e177e19a0687f0cc4a59a12746f
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_BYTES() {
  return ml_fixed((ml_fixed((2n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function BACKUPS() {
  return 4n;
}

export const translated = { "MAX_BYTES": MAX_BYTES(), "BACKUPS": BACKUPS() };
export const provenance = {"sourcePath":"src/operational_log.rs","sourceSha256":"e9b30715348879f62de6b532a765850318885e177e19a0687f0cc4a59a12746f","executable":2,"executableFunctions":0,"executableConstants":2,"carried":15,"preserved":18,"runtimeParity":false};
