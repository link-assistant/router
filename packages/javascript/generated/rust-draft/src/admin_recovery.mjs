// Generated draft from src/admin_recovery.rs; sha256=3c5dd4fb50cb708c6a0a54d076018e1794765c2c0a89a6f1a50ef004123821c9
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function rp_61646d696e5f7265636f766572792e5245434f56455245445f41444d494e5f4c4142454c() {
  return "recovered-admin";
}

function ml_make_Recovery_Recovery(token, token_id, revoked, retained_admins) {
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof token_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token_id))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(revoked, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(retained_admins, 0n, 18446744073709551615n, "u64 argument retained_admins out of range");
  if (!(typeof retained_admins === 'bigint' && retained_admins >= 0n && retained_admins <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Recovery", ["token"]: token, ["token_id"]: token_id, ["revoked"]: revoked, ["retained_admins"]: retained_admins });
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

export const translated = { ["RECOVERED_ADMIN_LABEL"]: rp_61646d696e5f7265636f766572792e5245434f56455245445f41444d494e5f4c4142454c(), ["Recovery"]: ml_make_Recovery_Recovery };
export const provenance = {"sourcePath":"src/admin_recovery.rs","sourceSha256":"3c5dd4fb50cb708c6a0a54d076018e1794765c2c0a89a6f1a50ef004123821c9","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":7,"preserved":10,"runtimeParity":false};
