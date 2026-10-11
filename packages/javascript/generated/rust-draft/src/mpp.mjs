// Generated draft from src/mpp.rs; sha256=eeeb0629ebaf10b333867903abd5eba90886d63ec11bd9a8157a13eec3c6cc01
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function ml_make_MppConfig_MppConfig(enabled, amount, currency, recipient, method) {
  if (!(typeof enabled === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof amount === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(amount))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof currency === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(currency))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof recipient === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(recipient))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(method, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  return Object.freeze({ $: "MppConfig", ["enabled"]: enabled, ["amount"]: amount, ["currency"]: currency, ["recipient"]: recipient, ["method"]: method });
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

export const translated = { ["MppConfig"]: ml_make_MppConfig_MppConfig };
export const provenance = {"sourcePath":"src/mpp.rs","sourceSha256":"eeeb0629ebaf10b333867903abd5eba90886d63ec11bd9a8157a13eec3c6cc01","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":11,"preserved":13,"runtimeParity":false};
