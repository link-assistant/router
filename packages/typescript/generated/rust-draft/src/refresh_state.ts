// Generated draft from src/refresh_state.rs; sha256=19e80a6134db539df9d694302359cf150013e24cad3f552ba7f147cfff566495
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function INITIAL_BACKOFF_MS() {
  return 1000n;
}

function MAX_BACKOFF_MS() {
  return ml_fixed((ml_fixed((5n * 60n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow") * 1000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function ROTATION_GRACE_MS() {
  return ml_fixed((ml_fixed((5n * 60n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow") * 1000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

export const translated: { "INITIAL_BACKOFF_MS": bigint; "MAX_BACKOFF_MS": bigint; "ROTATION_GRACE_MS": bigint } = { "INITIAL_BACKOFF_MS": INITIAL_BACKOFF_MS(), "MAX_BACKOFF_MS": MAX_BACKOFF_MS(), "ROTATION_GRACE_MS": ROTATION_GRACE_MS() };
export const provenance = {"sourcePath":"src/refresh_state.rs","sourceSha256":"19e80a6134db539df9d694302359cf150013e24cad3f552ba7f147cfff566495","executable":3,"carried":16,"preserved":20,"runtimeParity":false};
