// Generated draft from src/pool_response.rs; sha256=85526521da0b9dc965513ed08e79e05aef2e5b9ce48847404bacd313d4c12b14
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_706f6f6c5f726573706f6e73652e4d41585f4552524f525f4259544553() {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { ["MAX_ERROR_BYTES"]: rp_706f6f6c5f726573706f6e73652e4d41585f4552524f525f4259544553() };
export const provenance = {"sourcePath":"src/pool_response.rs","sourceSha256":"85526521da0b9dc965513ed08e79e05aef2e5b9ce48847404bacd313d4c12b14","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":5,"preserved":7,"runtimeParity":false};
