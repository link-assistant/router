// Generated draft from src/anthropic_nonstream.rs; sha256=932f7546b64d336c3c0611dc369b985e9aca91825fc62cd556570baa89f578a5
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_BUFFERED_RESPONSE() {
  return ml_fixed((ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { "MAX_BUFFERED_RESPONSE": MAX_BUFFERED_RESPONSE() };
export const provenance = {"sourcePath":"src/anthropic_nonstream.rs","sourceSha256":"932f7546b64d336c3c0611dc369b985e9aca91825fc62cd556570baa89f578a5","executable":1,"executableFunctions":0,"executableConstants":1,"carried":17,"preserved":19,"runtimeParity":false};
