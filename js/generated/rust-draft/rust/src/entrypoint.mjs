// Generated draft from rust/src/entrypoint.rs; sha256=39268a95729f7c2f4004ce47761afb31369ddb600ff3c63b3fc890868f6aa85e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_656e747279706f696e742e535441434b5f4259544553() {
  return ml_fixed((ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { ["STACK_BYTES"]: rp_656e747279706f696e742e535441434b5f4259544553() };
export const provenance = {"sourcePath":"rust/src/entrypoint.rs","sourceSha256":"39268a95729f7c2f4004ce47761afb31369ddb600ff3c63b3fc890868f6aa85e","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":4,"preserved":6,"runtimeParity":false};
