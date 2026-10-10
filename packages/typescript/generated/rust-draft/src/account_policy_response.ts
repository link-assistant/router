// Generated draft from src/account_policy_response.rs; sha256=cba71c37802a28a1f9108efec2c1422c8c7bcd9e19022d909cec5a6e1219dc03
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_RESPONSE_BYTES() {
  return ml_fixed((ml_fixed((32n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_EVENT_BYTES() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MAX_RESPONSE_BYTES": bigint; "MAX_EVENT_BYTES": bigint } = { "MAX_RESPONSE_BYTES": MAX_RESPONSE_BYTES(), "MAX_EVENT_BYTES": MAX_EVENT_BYTES() };
export const provenance = {"sourcePath":"src/account_policy_response.rs","sourceSha256":"cba71c37802a28a1f9108efec2c1422c8c7bcd9e19022d909cec5a6e1219dc03","executable":2,"carried":9,"preserved":12,"runtimeParity":false};
