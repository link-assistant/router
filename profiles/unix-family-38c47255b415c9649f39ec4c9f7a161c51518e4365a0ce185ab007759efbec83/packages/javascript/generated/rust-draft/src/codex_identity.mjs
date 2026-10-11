// Generated draft from src/codex_identity.rs; sha256=7c53538bbf40978613f8b97282d67db9beabcf2ad3b1fab02b0ffcc8906b951e
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function rp_636f6465785f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e() {
  return "0.154.0";
}

function rp_636f6465785f6964656e746974792e4f524947494e41544f52() {
  return "codex_cli_rs";
}

function ml_make_TmuxClientInfo_TmuxClientInfo(termtype, termname) {
  ml_validate_rust_value(termtype, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(termname, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  return Object.freeze({ $: "TmuxClientInfo", ["termtype"]: termtype, ["termname"]: termname });
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

export const translated = { ["DEFAULT_CLIENT_VERSION"]: rp_636f6465785f6964656e746974792e44454641554c545f434c49454e545f56455253494f4e(), ["ORIGINATOR"]: rp_636f6465785f6964656e746974792e4f524947494e41544f52(), ["TmuxClientInfo"]: ml_make_TmuxClientInfo_TmuxClientInfo };
export const provenance = {"sourcePath":"src/codex_identity.rs","sourceSha256":"7c53538bbf40978613f8b97282d67db9beabcf2ad3b1fab02b0ffcc8906b951e","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":13,"preserved":17,"runtimeParity":false};
