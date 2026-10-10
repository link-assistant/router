// Generated draft from src/resource_capture.rs; sha256=897136aaa5c146ef01219581665b0fa88299ea66af865ed1fe368f0625399d35
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function MAX_BUFFERED_ID_PREFIX() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function MAX_BUFFERED_JSON_RESPONSE() {
  return ml_fixed((ml_fixed((32n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { "MAX_BUFFERED_ID_PREFIX": MAX_BUFFERED_ID_PREFIX(), "MAX_BUFFERED_JSON_RESPONSE": MAX_BUFFERED_JSON_RESPONSE() };
export const provenance = {"sourcePath":"src/resource_capture.rs","sourceSha256":"897136aaa5c146ef01219581665b0fa88299ea66af865ed1fe368f0625399d35","executable":2,"executableFunctions":0,"executableConstants":2,"carried":25,"preserved":28,"runtimeParity":false};
