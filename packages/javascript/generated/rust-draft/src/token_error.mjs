// Generated draft from src/token_error.rs; sha256=7461c7d04125715cbf5355778a10ba275d0af3742c61f12b99d37368af090353
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_ExpiryFacts_ExpiryFacts(issued_at, expires_at, ago_seconds) {
  ml_fixed(issued_at, -9223372036854775808n, 9223372036854775807n, "i64 argument issued_at out of range");
  if (!(typeof issued_at === 'bigint' && issued_at >= -9223372036854775808n && issued_at <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(expires_at, -9223372036854775808n, 9223372036854775807n, "i64 argument expires_at out of range");
  if (!(typeof expires_at === 'bigint' && expires_at >= -9223372036854775808n && expires_at <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(ago_seconds, -9223372036854775808n, 9223372036854775807n, "i64 argument ago_seconds out of range");
  if (!(typeof ago_seconds === 'bigint' && ago_seconds >= -9223372036854775808n && ago_seconds <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ExpiryFacts", ["issued_at"]: issued_at, ["expires_at"]: expires_at, ["ago_seconds"]: ago_seconds });
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
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function ml_make_BudgetFacts_BudgetFacts(used, limit) {
  ml_fixed(used, 0n, 18446744073709551615n, "u64 argument used out of range");
  if (!(typeof used === 'bigint' && used >= 0n && used <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(limit, 0n, 18446744073709551615n, "u64 argument limit out of range");
  if (!(typeof limit === 'bigint' && limit >= 0n && limit <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "BudgetFacts", ["used"]: used, ["limit"]: limit });
}

export const translated = { ["ExpiryFacts"]: ml_make_ExpiryFacts_ExpiryFacts, ["BudgetFacts"]: ml_make_BudgetFacts_BudgetFacts };
export const provenance = {"sourcePath":"src/token_error.rs","sourceSha256":"7461c7d04125715cbf5355778a10ba275d0af3742c61f12b99d37368af090353","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":2,"carried":7,"preserved":9,"runtimeParity":false};
