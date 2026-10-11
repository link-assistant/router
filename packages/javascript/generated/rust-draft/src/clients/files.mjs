// Generated draft from src/clients/files.rs; sha256=414d900f3cd93bffecd15bbf4078dc38fdd6734e2a55fcea6d68e7e8714505e5
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function ml_make_CodexMarker_CodexMarker(previous_provider, managed_chatgpt_base_url, previous_chatgpt_base_url, managed_realtime_base_url, previous_realtime_ws_base_url, previous_realtime_call_base_url) {
  ml_validate_rust_value(previous_provider, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(managed_chatgpt_base_url, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(previous_chatgpt_base_url, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(managed_realtime_base_url, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(previous_realtime_ws_base_url, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_validate_rust_value(previous_realtime_call_base_url, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  return Object.freeze({ $: "CodexMarker", ["previous_provider"]: previous_provider, ["managed_chatgpt_base_url"]: managed_chatgpt_base_url, ["previous_chatgpt_base_url"]: previous_chatgpt_base_url, ["managed_realtime_base_url"]: managed_realtime_base_url, ["previous_realtime_ws_base_url"]: previous_realtime_ws_base_url, ["previous_realtime_call_base_url"]: previous_realtime_call_base_url });
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

export const translated = { ["CodexMarker"]: ml_make_CodexMarker_CodexMarker };
export const provenance = {"sourcePath":"src/clients/files.rs","sourceSha256":"414d900f3cd93bffecd15bbf4078dc38fdd6734e2a55fcea6d68e7e8714505e5","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":19,"preserved":21,"runtimeParity":false};
