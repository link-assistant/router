// Generated draft from rust/src/clients/files.rs; sha256=414d900f3cd93bffecd15bbf4078dc38fdd6734e2a55fcea6d68e7e8714505e5
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_8c554c06d17a73b7c310bfe2b39805dca08d334678597fa1336fba8729c7316c = {"schemaVersion":1,"types":{"CodexMarker":{"kind":"data","name":"CodexMarker","ctors":[{"name":"CodexMarker","fields":[{"name":"previous_provider","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"managed_chatgpt_base_url","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"previous_chatgpt_base_url","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"managed_realtime_base_url","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"previous_realtime_ws_base_url","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"previous_realtime_call_base_url","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function ml_make_CodexMarker_CodexMarker(previous_provider, managed_chatgpt_base_url, previous_chatgpt_base_url, managed_realtime_base_url, previous_realtime_ws_base_url, previous_realtime_call_base_url) {
  ml_assert_constructor_input(previous_provider, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(previous_provider, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(managed_chatgpt_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(managed_chatgpt_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(previous_chatgpt_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(previous_chatgpt_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(managed_realtime_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(managed_realtime_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(previous_realtime_ws_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(previous_realtime_ws_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_assert_constructor_input(previous_realtime_call_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(previous_realtime_call_base_url, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  return ml_snapshot_constructor_value(Object.freeze({ $: "CodexMarker", ["previous_provider"]: previous_provider, ["managed_chatgpt_base_url"]: managed_chatgpt_base_url, ["previous_chatgpt_base_url"]: previous_chatgpt_base_url, ["managed_realtime_base_url"]: managed_realtime_base_url, ["previous_realtime_ws_base_url"]: previous_realtime_ws_base_url, ["previous_realtime_call_base_url"]: previous_realtime_call_base_url }), {"kind":"data","name":"CodexMarker"}, ml_constructor_value_schema_8c554c06d17a73b7c310bfe2b39805dca08d334678597fa1336fba8729c7316c);
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

export const translated = { ["CodexMarker"]: ml_make_CodexMarker_CodexMarker };
export const provenance = {"sourcePath":"rust/src/clients/files.rs","sourceSha256":"414d900f3cd93bffecd15bbf4078dc38fdd6734e2a55fcea6d68e7e8714505e5","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":19,"preserved":21,"runtimeParity":false};
