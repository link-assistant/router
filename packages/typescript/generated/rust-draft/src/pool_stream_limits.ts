// Generated draft from src/pool_stream_limits.rs; sha256=91d5cc85d35e14675b3dd72fabfedf3a8ac4d441453c5c2665df52c83fcb92eb
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: any, min: any, max: any, message: any) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_EVENT_BYTES() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MAX_EVENT_BYTES": bigint } = { "MAX_EVENT_BYTES": MAX_EVENT_BYTES() };
export const provenance = {"sourcePath":"src/pool_stream_limits.rs","sourceSha256":"91d5cc85d35e14675b3dd72fabfedf3a8ac4d441453c5c2665df52c83fcb92eb","executable":1,"carried":5,"preserved":7,"runtimeParity":false};
