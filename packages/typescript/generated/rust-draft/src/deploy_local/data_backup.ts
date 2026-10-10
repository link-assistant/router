// Generated draft from src/deploy_local/data_backup.rs; sha256=346c71e03279c446d37df23dfc7d9b1651ef614eb69d53f61de617763d09138e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function LIMIT() {
  return ml_fixed((ml_fixed((256n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function FILES() {
  return 10000n;
}

function DEPTH() {
  return 32n;
}

function SCHEMA() {
  return "link-assistant-router/data-backup/v1";
}

export const translated: { "LIMIT": bigint; "FILES": bigint; "DEPTH": bigint; "SCHEMA": string } = { "LIMIT": LIMIT(), "FILES": FILES(), "DEPTH": DEPTH(), "SCHEMA": SCHEMA() };
export const provenance = {"sourcePath":"src/deploy_local/data_backup.rs","sourceSha256":"346c71e03279c446d37df23dfc7d9b1651ef614eb69d53f61de617763d09138e","executable":4,"executableFunctions":0,"executableConstants":4,"carried":28,"preserved":33,"runtimeParity":false};
