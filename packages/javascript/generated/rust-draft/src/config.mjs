// Generated draft from src/config.rs; sha256=9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function DEFAULT_MAX_PROXY_REQUEST_BYTES() {
  return ml_fixed((ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function default_activitypub_public_key_pem() {
  return "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA0000000000000000000000000000000000000000000=\n-----END PUBLIC KEY-----";
}

export const translated = { "DEFAULT_MAX_PROXY_REQUEST_BYTES": DEFAULT_MAX_PROXY_REQUEST_BYTES(), default_activitypub_public_key_pem };
export const provenance = {"sourcePath":"src/config.rs","sourceSha256":"9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a","executable":2,"executableFunctions":1,"executableConstants":1,"carried":31,"preserved":34,"runtimeParity":false};
