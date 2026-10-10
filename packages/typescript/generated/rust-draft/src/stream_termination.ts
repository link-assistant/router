// Generated draft from src/stream_termination.rs; sha256=96e99a807fab7c520d2739fcbb3a0138b1933d7c2c8bfe816db329d257e9e50a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: any, min: any, max: any, message: any) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function INCOMPLETE_STREAM_MESSAGE() {
  return "upstream stream ended before completion";
}

function MAX_SSE_CARRY_BYTES() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "INCOMPLETE_STREAM_MESSAGE": string; "MAX_SSE_CARRY_BYTES": bigint } = { "INCOMPLETE_STREAM_MESSAGE": INCOMPLETE_STREAM_MESSAGE(), "MAX_SSE_CARRY_BYTES": MAX_SSE_CARRY_BYTES() };
export const provenance = {"sourcePath":"src/stream_termination.rs","sourceSha256":"96e99a807fab7c520d2739fcbb3a0138b1933d7c2c8bfe816db329d257e9e50a","executable":2,"carried":18,"preserved":21,"runtimeParity":false};
