// Generated draft from src/token_reservation.rs; sha256=115b9ad5be1a884e67797bb6aa7065da3729d79bd511966f44e35ae8ed734df8
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_746f6b656e5f7265736572766174696f6e2e43484152535f5045525f544f4b454e() {
  return 4n;
}

function rp_746f6b656e5f7265736572766174696f6e2e44454641554c545f4d41585f4f55545055545f544f4b454e53() {
  return 4096n;
}

function ml_make_RequestBudget_RequestBudget(input, output) {
  ml_fixed(input, 0n, 18446744073709551615n, "u64 argument input out of range");
  if (!(typeof input === 'bigint' && input >= 0n && input <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(output, 0n, 18446744073709551615n, "u64 argument output out of range");
  if (!(typeof output === 'bigint' && output >= 0n && output <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "RequestBudget", ["input"]: input, ["output"]: output });
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

export const translated = { ["CHARS_PER_TOKEN"]: rp_746f6b656e5f7265736572766174696f6e2e43484152535f5045525f544f4b454e(), ["DEFAULT_MAX_OUTPUT_TOKENS"]: rp_746f6b656e5f7265736572766174696f6e2e44454641554c545f4d41585f4f55545055545f544f4b454e53(), ["RequestBudget"]: ml_make_RequestBudget_RequestBudget };
export const provenance = {"sourcePath":"src/token_reservation.rs","sourceSha256":"115b9ad5be1a884e67797bb6aa7065da3729d79bd511966f44e35ae8ed734df8","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":7,"preserved":11,"runtimeParity":false};
