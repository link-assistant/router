// Generated draft from tests/upstream_resilience_test.rs; sha256=c7f749d223c2a0e4b1d04a35852c0017e3c70fec475f3cf0439844b98380c43f
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function SECRET() {
  return "upstream-resilience-test-secret";
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

function ml_make_Post_Stall(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Stall', field0: field0 });
}

function ml_make_Post_Redirect(field0, field1) {
  if (typeof field0 !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(field0, 0n, 65535n, "u16 argument field0 out of range");
  if (!(typeof field0 === 'bigint' && field0 >= 0n && field0 <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof field1 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field1))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Redirect', field0: field0, field1: field1 });
}

export const translated = { ["SECRET"]: SECRET(), ["Post"]: Object.freeze({ ["Stall"]: ml_make_Post_Stall, ["Redirect"]: ml_make_Post_Redirect }) };
export const provenance = {"sourcePath":"tests/upstream_resilience_test.rs","sourceSha256":"c7f749d223c2a0e4b1d04a35852c0017e3c70fec475f3cf0439844b98380c43f","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":2,"carried":25,"preserved":28,"runtimeParity":false};
