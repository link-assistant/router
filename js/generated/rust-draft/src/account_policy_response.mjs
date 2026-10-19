// Generated draft from src/account_policy_response.rs; sha256=cba71c37802a28a1f9108efec2c1422c8c7bcd9e19022d909cec5a6e1219dc03
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6163636f756e745f706f6c6963795f726573706f6e73652e4d41585f524553504f4e53455f4259544553() {
  return ml_fixed((ml_fixed((32n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_6163636f756e745f706f6c6963795f726573706f6e73652e4d41585f4556454e545f4259544553() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { ["MAX_RESPONSE_BYTES"]: rp_6163636f756e745f706f6c6963795f726573706f6e73652e4d41585f524553504f4e53455f4259544553(), ["MAX_EVENT_BYTES"]: rp_6163636f756e745f706f6c6963795f726573706f6e73652e4d41585f4556454e545f4259544553() };
export const provenance = {"sourcePath":"src/account_policy_response.rs","sourceSha256":"cba71c37802a28a1f9108efec2c1422c8c7bcd9e19022d909cec5a6e1219dc03","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":9,"preserved":12,"runtimeParity":false};
