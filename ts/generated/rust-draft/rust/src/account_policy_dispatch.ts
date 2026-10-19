
// Generated draft from rust/src/account_policy_dispatch.rs; sha256=60ec406c1550cabf9d9b278766fbe6231af045a19059b05d3381898146a5aa84
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6163636f756e745f706f6c6963795f64697370617463682e4d41585f4552524f525f4259544553(): bigint {
  return ml_fixed((16n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "MAX_ERROR_BYTES": bigint } = { ["MAX_ERROR_BYTES"]: rp_6163636f756e745f706f6c6963795f64697370617463682e4d41585f4552524f525f4259544553() };
export const provenance = {"sourcePath":"rust/src/account_policy_dispatch.rs","sourceSha256":"60ec406c1550cabf9d9b278766fbe6231af045a19059b05d3381898146a5aa84","executable":1,"executableFunctions":0,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":13,"preserved":15,"runtimeParity":false};
