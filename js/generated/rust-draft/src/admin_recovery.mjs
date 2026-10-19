// Generated draft from src/admin_recovery.rs; sha256=3c5dd4fb50cb708c6a0a54d076018e1794765c2c0a89a6f1a50ef004123821c9
// Carried constructs are data, never runtime parity evidence.
import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_constructor_value_schema_8b0d6197d354eb91b578c44a832ea905d08d40bbb6d0b4c16493e606563ad68c = {"schemaVersion":1,"types":{"Recovery":{"kind":"data","name":"Recovery","ctors":[{"name":"Recovery","fields":[{"name":"token","type":{"kind":"string"}},{"name":"token_id","type":{"kind":"string"}},{"name":"revoked","type":{"kind":"array","element":{"kind":"string"}}},{"name":"retained_admins","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

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
  ml_assert_constructor_input(revoked, {"kind":"array","element":{"kind":"string"}}, ml_constructor_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085);
  if (!ml_router_array(revoked, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (typeof retained_admins !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(retained_admins, 0n, 18446744073709551615n, "u64 argument retained_admins out of range");
  if (!(typeof retained_admins === 'bigint' && retained_admins >= 0n && retained_admins <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "Recovery", ["token"]: token, ["token_id"]: token_id, ["revoked"]: revoked, ["retained_admins"]: retained_admins }), {"kind":"data","name":"Recovery"}, ml_constructor_value_schema_8b0d6197d354eb91b578c44a832ea905d08d40bbb6d0b4c16493e606563ad68c);
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
