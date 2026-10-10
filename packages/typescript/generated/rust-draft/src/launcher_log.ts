// Generated draft from src/launcher_log.rs; sha256=be755843f641b92af9b9bbcf46120ab477fdcc4ee1f75a8238aa7a069c9b3a9b
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_BYTES() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ARCHIVES() {
  return 5n;
}

function MAX_MESSAGE_BYTES() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MAX_BYTES": bigint; "ARCHIVES": bigint; "MAX_MESSAGE_BYTES": bigint } = { "MAX_BYTES": MAX_BYTES(), "ARCHIVES": ARCHIVES(), "MAX_MESSAGE_BYTES": MAX_MESSAGE_BYTES() };
export const provenance = {"sourcePath":"src/launcher_log.rs","sourceSha256":"be755843f641b92af9b9bbcf46120ab477fdcc4ee1f75a8238aa7a069c9b3a9b","executable":3,"executableFunctions":0,"executableConstants":3,"carried":24,"preserved":28,"runtimeParity":false};
