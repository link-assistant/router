// Generated draft from src/pool_failover.rs; sha256=58c0977f22c4b44d1ec68723ea808d866de108cb6ed94a9e870cf8442c1865db
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function DEFAULT_MAX_ATTEMPTS() {
  return 3n;
}

function DEFAULT_BUDGET_SECS() {
  return 30n;
}

function MAX_BUDGET_SECS() {
  return ml_fixed((ml_fixed((24n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated = { "DEFAULT_MAX_ATTEMPTS": DEFAULT_MAX_ATTEMPTS(), "DEFAULT_BUDGET_SECS": DEFAULT_BUDGET_SECS(), "MAX_BUDGET_SECS": MAX_BUDGET_SECS() };
export const provenance = {"sourcePath":"src/pool_failover.rs","sourceSha256":"58c0977f22c4b44d1ec68723ea808d866de108cb6ed94a9e870cf8442c1865db","executable":3,"executableFunctions":0,"executableConstants":3,"carried":20,"preserved":24,"runtimeParity":false};
