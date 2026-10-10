// Generated draft from src/subscription_usage.rs; sha256=d78f65d64a28f22cc247f6716a260aa6c79786b543b3d0ce097b887dce46a1d9
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function SCHEMA_VERSION() {
  return 1n;
}

function MAX_USAGE_BODY() {
  return ml_fixed((ml_fixed((2n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { "SCHEMA_VERSION": SCHEMA_VERSION(), "MAX_USAGE_BODY": MAX_USAGE_BODY() };
export const provenance = {"sourcePath":"src/subscription_usage.rs","sourceSha256":"d78f65d64a28f22cc247f6716a260aa6c79786b543b3d0ce097b887dce46a1d9","executable":2,"executableFunctions":0,"executableConstants":2,"carried":56,"preserved":58,"runtimeParity":false};
