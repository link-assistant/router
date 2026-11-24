// Generated draft from rust/src/pool_stream_limits.rs; sha256=9629e6fa072bb4ab660aeb08052a83232fa895598e85e91a6f3568e549f37eda
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_706f6f6c5f73747265616d5f6c696d6974732e4d41585f4556454e545f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { ["MAX_EVENT_BYTES"]: rp_706f6f6c5f73747265616d5f6c696d6974732e4d41585f4556454e545f4259544553() };
export const provenance = {"sourcePath":"rust/src/pool_stream_limits.rs","sourceSha256":"9629e6fa072bb4ab660aeb08052a83232fa895598e85e91a6f3568e549f37eda","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":5,"preserved":7,"runtimeParity":false};
