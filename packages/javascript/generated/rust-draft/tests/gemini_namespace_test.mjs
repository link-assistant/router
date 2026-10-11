// Generated draft from tests/gemini_namespace_test.rs; sha256=b5ae148b8142219008f856bb3ac10420aab42d1b4c232d005caca488e67f5fb5
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function CODEX_MODELS() {
  return ml_copy_fixed_array(["gpt-5.4-mini", "gpt-5"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":2}});
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

function CLAUDE_MODELS() {
  return ml_copy_fixed_array(["claude-opus-4-7"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":1}});
}

function ml_make_CodexCatalog_Undiscovered() {
  return Object.freeze({ $: 'Undiscovered' });
}

function ml_make_CodexCatalog_Discovered(field0) {
  ml_validate_rust_value(field0, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  return Object.freeze({ $: 'Discovered', field0: field0 });
}

export const translated = { ["CODEX_MODELS"]: CODEX_MODELS(), ["CLAUDE_MODELS"]: CLAUDE_MODELS(), ["CodexCatalog"]: Object.freeze({ ["Undiscovered"]: ml_make_CodexCatalog_Undiscovered, ["Discovered"]: ml_make_CodexCatalog_Discovered }) };
export const provenance = {"sourcePath":"tests/gemini_namespace_test.rs","sourceSha256":"b5ae148b8142219008f856bb3ac10420aab42d1b4c232d005caca488e67f5fb5","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":2,"carried":43,"preserved":47,"runtimeParity":false};
