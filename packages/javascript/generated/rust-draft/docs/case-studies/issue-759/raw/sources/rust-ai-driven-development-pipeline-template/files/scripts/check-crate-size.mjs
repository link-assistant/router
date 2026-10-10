// Generated draft from docs/case-studies/issue-759/raw/sources/rust-ai-driven-development-pipeline-template/files/scripts/check-crate-size.rs; sha256=7dc506345b0d1a5d23c9b975a890643daa7461316d90c8d211f5f86d06348e16
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

// Integer division with the source's rounding; by zero it aborts with the message `zero`
// or, when that is null, is total (x / 0 = 0, x % 0 = x); a machine-integer quotient
// out of [min, max] aborts with `overflow`, the remainder too.
function ml_divide(a, b, rounding, zero, remainder, bounds) {
  if (b === 0n) {
    if (zero !== null) throw new RangeError(zero);
    return remainder ? a : 0n;
  }
  let q = a / b;
  const r = a - q * b;
  if (r !== 0n) {
    if (rounding === 'floor' && (r < 0n) !== (b < 0n)) q -= 1n;
    if (rounding === 'euclid' && r < 0n) q = b > 0n ? q - 1n : q + 1n;
  }
  if (bounds && (q < bounds[0] || q > bounds[1])) throw new RangeError(bounds[2]);
  return remainder ? a - q * b : q;
}

function MAX_CRATE_BYTES() {
  return ml_fixed((ml_fixed((10n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function WARN_CRATE_BYTES() {
  return ml_divide(ml_fixed((MAX_CRATE_BYTES() * 8n), 0n, 18446744073709551615n, "attempt to multiply with overflow"), 10n, 'trunc', "attempt to divide by zero", false, [0n, 18446744073709551615n, "attempt to divide with overflow"]);
}

function CARGO_PACKAGE_MAX_ATTEMPTS() {
  return 3n;
}

export const translated = { "MAX_CRATE_BYTES": MAX_CRATE_BYTES(), "WARN_CRATE_BYTES": WARN_CRATE_BYTES(), "CARGO_PACKAGE_MAX_ATTEMPTS": CARGO_PACKAGE_MAX_ATTEMPTS() };
export const provenance = {"sourcePath":"docs/case-studies/issue-759/raw/sources/rust-ai-driven-development-pipeline-template/files/scripts/check-crate-size.rs","sourceSha256":"7dc506345b0d1a5d23c9b975a890643daa7461316d90c8d211f5f86d06348e16","executable":3,"carried":14,"preserved":17,"runtimeParity":false};
