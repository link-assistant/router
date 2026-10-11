// Generated draft from src/safety_identifier.rs; sha256=3e05392e014ce9a24416cd80b99760ee3d35c8e22e7e9f6372479e4173bc094f
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function OPENAI_MAX_CHARACTERS() {
  return 64n;
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

function validate_openai(identifier) {
  ml_validate_rust_value(identifier, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (ml_host_option_bind(identifier, (value) => { return (BigInt(Array.from(value).length) > OPENAI_MAX_CHARACTERS()); }, "is_some_and")) {
    return Object.freeze({ $: 'Err', field0: (("safety_identifier must contain at most " + String(OPENAI_MAX_CHARACTERS())) + " characters") });
  } else {
  }
  return Object.freeze({ $: 'Ok', field0: null });
}

function validate_openai_user(user) {
  ml_validate_rust_value(user, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (ml_host_option_bind(user, (value) => { return (BigInt(Array.from(value).length) > OPENAI_MAX_CHARACTERS()); }, "is_some_and")) {
    return Object.freeze({ $: 'Err', field0: (("user must contain at most " + String(OPENAI_MAX_CHARACTERS())) + " characters") });
  } else {
  }
  return Object.freeze({ $: 'Ok', field0: null });
}

export const translated = { ["OPENAI_MAX_CHARACTERS"]: OPENAI_MAX_CHARACTERS(), ["validate_openai"]: validate_openai, ["validate_openai_user"]: validate_openai_user };
export const provenance = {"sourcePath":"src/safety_identifier.rs","sourceSha256":"3e05392e014ce9a24416cd80b99760ee3d35c8e22e7e9f6372479e4173bc094f","executable":3,"executableFunctions":2,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":4,"preserved":8,"runtimeParity":false};
