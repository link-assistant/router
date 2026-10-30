// Generated draft from rust/src/codex_identity.rs; sha256=aa48b183141e99293a9177cef95f3e2ced81873e4803c1aca7453a3d31407ecf
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_e84dae5e0e661561d29f2c1f9383053bc0ed5fb1dc7ead49d8b4f28bee1af85e = {"schemaVersion":1,"types":{"TmuxClientInfo":{"kind":"data","name":"TmuxClientInfo","ctors":[{"name":"TmuxClientInfo","fields":[{"name":"termtype","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"termname","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function rp_636f6465785f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e() {
  return "0.154.0";
}

function rp_636f6465785f6964656e746974792e4f524947494e41544f52() {
  return "codex_cli_rs";
}

function ml_make_TmuxClientInfo_TmuxClientInfo(termtype, termname) {
  ml_assert_constructor_input(termtype, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(termtype, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(termname, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(termname, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  return ml_snapshot_constructor_value(Object.freeze({ $: "TmuxClientInfo", ["termtype"]: termtype, ["termname"]: termname }), {"kind":"data","name":"TmuxClientInfo"}, ml_constructor_value_schema_e84dae5e0e661561d29f2c1f9383053bc0ed5fb1dc7ead49d8b4f28bee1af85e);
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

export const translated = { ["DEFAULT_CLIENT_VERSION"]: rp_636f6465785f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e(), ["ORIGINATOR"]: rp_636f6465785f6964656e746974792e4f524947494e41544f52(), ["TmuxClientInfo"]: ml_make_TmuxClientInfo_TmuxClientInfo };
export const provenance = {"sourcePath":"rust/src/codex_identity.rs","sourceSha256":"aa48b183141e99293a9177cef95f3e2ced81873e4803c1aca7453a3d31407ecf","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":13,"preserved":17,"runtimeParity":false};
