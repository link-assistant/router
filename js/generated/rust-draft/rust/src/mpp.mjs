// Generated draft from rust/src/mpp.rs; sha256=3309307d9714e1dcddb2e499510d8e655ac97d58fd4f507db9aef806b0f4f3c3
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_ca70ac401e98f70e5b3932f3af86395cec7f3c64c67a37ad662a2b8ef4c0f3f9 = {"schemaVersion":1,"types":{"MppConfig":{"kind":"data","name":"MppConfig","ctors":[{"name":"MppConfig","fields":[{"name":"enabled","type":{"kind":"bool"}},{"name":"amount","type":{"kind":"string"}},{"name":"currency","type":{"kind":"string"}},{"name":"recipient","type":{"kind":"string"}},{"name":"method","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function ml_make_MppConfig_MppConfig(enabled, amount, currency, recipient, method) {
  if (!(typeof enabled === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof amount === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(amount))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof currency === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(currency))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof recipient === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(recipient))) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(method, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(method, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  return ml_snapshot_constructor_value(Object.freeze({ $: "MppConfig", ["enabled"]: enabled, ["amount"]: amount, ["currency"]: currency, ["recipient"]: recipient, ["method"]: method }), {"kind":"data","name":"MppConfig"}, ml_constructor_value_schema_ca70ac401e98f70e5b3932f3af86395cec7f3c64c67a37ad662a2b8ef4c0f3f9);
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

const router_core_base64 = {

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
export const provenance = {"sourcePath":"rust/src/mpp.rs","sourceSha256":"3309307d9714e1dcddb2e499510d8e655ac97d58fd4f507db9aef806b0f4f3c3","executable":2,"executableFunctions":1,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":9,"preserved":12,"runtimeParity":false};
