// Generated draft from src/pool_stream_limits.rs; sha256=91d5cc85d35e14675b3dd72fabfedf3a8ac4d441453c5c2665df52c83fcb92eb
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_706f6f6c5f73747265616d5f6c696d6974732e4d41585f4556454e545f4259544553() {
  return ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { ["MAX_EVENT_BYTES"]: rp_706f6f6c5f73747265616d5f6c696d6974732e4d41585f4556454e545f4259544553() };
export const provenance = {"sourcePath":"src/pool_stream_limits.rs","sourceSha256":"91d5cc85d35e14675b3dd72fabfedf3a8ac4d441453c5c2665df52c83fcb92eb","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":5,"preserved":7,"runtimeParity":false};
