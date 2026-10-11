
// Generated draft from src/account_policy_dispatch.rs; sha256=974d618e5cb271eb7708dbaeb62e8d6225aee82bbf34329e74f603f3eb7c39cd
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6163636f756e745f706f6c6963795f64697370617463682e4d41585f4552524f525f4259544553(): bigint {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MAX_ERROR_BYTES": bigint } = { ["MAX_ERROR_BYTES"]: rp_6163636f756e745f706f6c6963795f64697370617463682e4d41585f4552524f525f4259544553() };
export const provenance = {"sourcePath":"src/account_policy_dispatch.rs","sourceSha256":"974d618e5cb271eb7708dbaeb62e8d6225aee82bbf34329e74f603f3eb7c39cd","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":13,"preserved":15,"runtimeParity":false};
