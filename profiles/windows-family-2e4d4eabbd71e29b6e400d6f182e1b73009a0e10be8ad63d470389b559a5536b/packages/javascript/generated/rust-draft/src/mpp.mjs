// Generated draft from src/mpp.rs; sha256=eeeb0629ebaf10b333867903abd5eba90886d63ec11bd9a8157a13eec3c6cc01
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function ml_make_MppConfig_MppConfig(enabled, amount, currency, recipient, method) {
  if (!(typeof enabled === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof amount === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(amount))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof currency === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(currency))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof recipient === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(recipient))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(method, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
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
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function rp_6d70702e6573636170655f6865616465725f76616c7565(value) {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  const ml_text_10 = (() => {
    const ml_text_7 = value;
    const ml_text_8 = "\\";
    const ml_text_9 = "\\\\";
    return (ml_text_8.length===0?(ml_text_7.length===0?ml_text_9:ml_text_9+Array.from(ml_text_7).join(ml_text_9)+ml_text_9):ml_text_7.split(ml_text_8).join(ml_text_9));
  })();
  const ml_text_11 = "\"";
  const ml_text_12 = "\\\"";
  return (ml_text_11.length===0?(ml_text_10.length===0?ml_text_12:ml_text_12+Array.from(ml_text_10).join(ml_text_12)+ml_text_12):ml_text_10.split(ml_text_11).join(ml_text_12));
}

export const translated = { ["MppConfig"]: ml_make_MppConfig_MppConfig, ["escape_header_value"]: rp_6d70702e6573636170655f6865616465725f76616c7565 };
export const provenance = {"sourcePath":"src/mpp.rs","sourceSha256":"eeeb0629ebaf10b333867903abd5eba90886d63ec11bd9a8157a13eec3c6cc01","executable":2,"executableFunctions":1,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":10,"preserved":13,"runtimeParity":false};
