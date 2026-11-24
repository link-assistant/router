// Generated draft from rust/src/error_log.rs; sha256=bfcf7e8ac7a7d0e9386774e8824da90db486410ed99488bddb3c68813f81753b
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6572726f725f6c6f672e44454641554c545f4d41585f4259544553() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6572726f725f6c6f672e4d41585f424f44595f4259544553() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6572726f725f6c6f672e4d41585f444f43554d454e545f4259544553() {
  return ml_fixed((ml_fixed((8n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { ["DEFAULT_MAX_BYTES"]: rp_6572726f725f6c6f672e44454641554c545f4d41585f4259544553(), ["MAX_BODY_BYTES"]: rp_6572726f725f6c6f672e4d41585f424f44595f4259544553(), ["MAX_DOCUMENT_BYTES"]: rp_6572726f725f6c6f672e4d41585f444f43554d454e545f4259544553() };
export const provenance = {"sourcePath":"rust/src/error_log.rs","sourceSha256":"bfcf7e8ac7a7d0e9386774e8824da90db486410ed99488bddb3c68813f81753b","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":13,"preserved":17,"runtimeParity":false};
