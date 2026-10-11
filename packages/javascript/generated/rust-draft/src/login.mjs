// Generated draft from src/login.rs; sha256=fbe7b5cbe73c68dfe53ed0c8b0f343595ed100de9f7175fcd240d69d83b6c0c5
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = new Map([]);

function SUCCESS_MARKERS() {
  return Object.freeze(["Loginsuccessful", "successfullyauthenticated", "sk-ant-oat"]);
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

function FAILURE_MARKERS() {
  return Object.freeze(["OAutherror", "PressEntertoretry", "Invalidcode", "invalid_grant", "Authenticationfailed", "Loginfailed"]);
}

function THEME_PICKER_MARKER() {
  return "Choosethetextstylethatlooksbestwithyourterminal";
}

function WORKSPACE_TRUST_MARKER() {
  return "Quicksafetycheck:Isthisaprojectyoucreated";
}

function LOGIN_METHOD_MARKER() {
  return "Selectloginmethod:";
}

function READY_PROMPT_MARKER() {
  return "Tipsforgettingstarted";
}

function TERMINAL_RETENTION_SECS() {
  return 300n;
}

function ml_make_FoundCredential_FoundCredential(expires_at) {
  ml_validate_rust_value(expires_at, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  return Object.freeze({ $: "FoundCredential", ["expires_at"]: expires_at });
}

export const translated = { ["SUCCESS_MARKERS"]: SUCCESS_MARKERS(), ["FAILURE_MARKERS"]: FAILURE_MARKERS(), ["THEME_PICKER_MARKER"]: THEME_PICKER_MARKER(), ["WORKSPACE_TRUST_MARKER"]: WORKSPACE_TRUST_MARKER(), ["LOGIN_METHOD_MARKER"]: LOGIN_METHOD_MARKER(), ["READY_PROMPT_MARKER"]: READY_PROMPT_MARKER(), ["TERMINAL_RETENTION_SECS"]: TERMINAL_RETENTION_SECS(), ["FoundCredential"]: ml_make_FoundCredential_FoundCredential };
export const provenance = {"sourcePath":"src/login.rs","sourceSha256":"fbe7b5cbe73c68dfe53ed0c8b0f343595ed100de9f7175fcd240d69d83b6c0c5","executable":8,"executableFunctions":0,"executableConstants":7,"executableTypes":1,"executableConstructors":1,"carried":30,"preserved":39,"runtimeParity":false};
