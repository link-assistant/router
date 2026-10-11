// Generated draft from src/auth_import.rs; sha256=0410916d8c67ba696216d47f221dc92b725c4d6f6c22e5fe6b46a3e6c815fef1
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

function ml_make_CredentialProbe_Accepted() {
  return Object.freeze({ $: 'Accepted' });
}

function ml_make_CredentialProbe_Rejected() {
  return Object.freeze({ $: 'Rejected' });
}

function ml_make_CredentialProbe_Unverified() {
  return Object.freeze({ $: 'Unverified' });
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
};

const serde_json = {
  error: {

  },
};

function humanize_minutes(minutes) {
  ml_fixed(minutes, -9223372036854775808n, 9223372036854775807n, "i64 argument minutes out of range");
  if (!(typeof minutes === 'bigint' && minutes >= -9223372036854775808n && minutes <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  if ((minutes < 90n)) {
    return (String(minutes) + " minutes");
  } else {
  }
  const hours = ml_divide(minutes, 60n, 'trunc', "attempt to divide by zero", false, [-9223372036854775808n, 9223372036854775807n, "attempt to divide with overflow"]);
  if ((hours < 48n)) {
    return (String(hours) + " hours");
  } else {
  }
  return (String(ml_divide(hours, 24n, 'trunc', "attempt to divide by zero", false, [-9223372036854775808n, 9223372036854775807n, "attempt to divide with overflow"])) + " days");
}

export const translated = { ["CredentialProbe"]: Object.freeze({ ["Accepted"]: ml_make_CredentialProbe_Accepted, ["Rejected"]: ml_make_CredentialProbe_Rejected, ["Unverified"]: ml_make_CredentialProbe_Unverified }), ["humanize_minutes"]: humanize_minutes };
export const provenance = {"sourcePath":"src/auth_import.rs","sourceSha256":"0410916d8c67ba696216d47f221dc92b725c4d6f6c22e5fe6b46a3e6c815fef1","executable":2,"executableFunctions":1,"executableConstants":0,"executableTypes":1,"executableConstructors":3,"carried":31,"preserved":34,"runtimeParity":false};
