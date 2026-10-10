// Generated draft from src/gonka.rs; sha256=e88edf7455de0af62be89883df2ca5063a60aa59591f22ee75f73dec6e3a15b9
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MISSING_API_KEY_MESSAGE() {
  return "Gonka broker mode requires GONKA_API_KEY";
}

function MAX_CATALOG_BYTES() {
  return ml_fixed((ml_fixed((4n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_SSE_CARRY_BYTES() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MISSING_API_KEY_MESSAGE": string; "MAX_CATALOG_BYTES": bigint; "MAX_SSE_CARRY_BYTES": bigint } = { "MISSING_API_KEY_MESSAGE": MISSING_API_KEY_MESSAGE(), "MAX_CATALOG_BYTES": MAX_CATALOG_BYTES(), "MAX_SSE_CARRY_BYTES": MAX_SSE_CARRY_BYTES() };
export const provenance = {"sourcePath":"src/gonka.rs","sourceSha256":"e88edf7455de0af62be89883df2ca5063a60aa59591f22ee75f73dec6e3a15b9","executable":3,"carried":33,"preserved":37,"runtimeParity":false};
