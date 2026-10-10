// Generated draft from src/entrypoint.rs; sha256=39268a95729f7c2f4004ce47761afb31369ddb600ff3c63b3fc890868f6aa85e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: any, min: any, max: any, message: any) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function STACK_BYTES() {
  return ml_fixed((ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "STACK_BYTES": bigint } = { "STACK_BYTES": STACK_BYTES() };
export const provenance = {"sourcePath":"src/entrypoint.rs","sourceSha256":"39268a95729f7c2f4004ce47761afb31369ddb600ff3c63b3fc890868f6aa85e","executable":1,"carried":4,"preserved":6,"runtimeParity":false};
