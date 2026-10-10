// Generated draft from src/zai_upstream_error.rs; sha256=a4efc0de6d38d5bd7ba17a31d0d078145435ffe45f908f1ee7868337e9c0e023
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_CLASSIFIED_BODY() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function STATE_FILE() {
  return "provider-exhaustion.json";
}

export const translated: { "MAX_CLASSIFIED_BODY": bigint; "STATE_FILE": string } = { "MAX_CLASSIFIED_BODY": MAX_CLASSIFIED_BODY(), "STATE_FILE": STATE_FILE() };
export const provenance = {"sourcePath":"src/zai_upstream_error.rs","sourceSha256":"a4efc0de6d38d5bd7ba17a31d0d078145435ffe45f908f1ee7868337e9c0e023","executable":2,"carried":20,"preserved":23,"runtimeParity":false};
