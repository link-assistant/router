// Generated draft from src/resource_capture.rs; sha256=897136aaa5c146ef01219581665b0fa88299ea66af865ed1fe368f0625399d35
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_7265736f757263655f636170747572652e4d41585f42554646455245445f49445f505245464958() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_7265736f757263655f636170747572652e4d41585f42554646455245445f4a534f4e5f524553504f4e5345() {
  return ml_fixed((ml_fixed((32n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { ["MAX_BUFFERED_ID_PREFIX"]: rp_7265736f757263655f636170747572652e4d41585f42554646455245445f49445f505245464958(), ["MAX_BUFFERED_JSON_RESPONSE"]: rp_7265736f757263655f636170747572652e4d41585f42554646455245445f4a534f4e5f524553504f4e5345() };
export const provenance = {"sourcePath":"src/resource_capture.rs","sourceSha256":"897136aaa5c146ef01219581665b0fa88299ea66af865ed1fe368f0625399d35","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":25,"preserved":28,"runtimeParity":false};
