// Generated draft from src/login.rs; sha256=fbe7b5cbe73c68dfe53ed0c8b0f343595ed100de9f7175fcd240d69d83b6c0c5
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = new Map([]);

function rp_6c6f67696e2e535543434553535f4d41524b455253() {
  return Object.freeze(Object.freeze(["Loginsuccessful", "successfullyauthenticated", "sk-ant-oat"]));
}

function rp_6c6f67696e2e4641494c5552455f4d41524b455253() {
  return Object.freeze(Object.freeze(["OAutherror", "PressEntertoretry", "Invalidcode", "invalid_grant", "Authenticationfailed", "Loginfailed"]));
}

function rp_6c6f67696e2e5448454d455f5049434b45525f4d41524b4552() {
  return "Choosethetextstylethatlooksbestwithyourterminal";
}

function rp_6c6f67696e2e574f524b53504143455f54525553545f4d41524b4552() {
  return "Quicksafetycheck:Isthisaprojectyoucreated";
}

function rp_6c6f67696e2e4c4f47494e5f4d4554484f445f4d41524b4552() {
  return "Selectloginmethod:";
}

function rp_6c6f67696e2e52454144595f50524f4d50545f4d41524b4552() {
  return "Tipsforgettingstarted";
}

function rp_6c6f67696e2e5445524d494e414c5f524554454e54494f4e5f53454353() {
  return 300n;
}

function ml_make_Outcome_Authorized(expires_at) {
  ml_validate_rust_value(expires_at, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  return Object.freeze({ $: "Authorized", ["expires_at"]: expires_at });
}

function ml_make_Outcome_Failed(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Failed', field0: field0 });
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

function ml_make_FoundCredential_FoundCredential(expires_at) {
  ml_validate_rust_value(expires_at, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  return Object.freeze({ $: "FoundCredential", ["expires_at"]: expires_at });
}

export const translated = { ["SUCCESS_MARKERS"]: rp_6c6f67696e2e535543434553535f4d41524b455253(), ["FAILURE_MARKERS"]: rp_6c6f67696e2e4641494c5552455f4d41524b455253(), ["THEME_PICKER_MARKER"]: rp_6c6f67696e2e5448454d455f5049434b45525f4d41524b4552(), ["WORKSPACE_TRUST_MARKER"]: rp_6c6f67696e2e574f524b53504143455f54525553545f4d41524b4552(), ["LOGIN_METHOD_MARKER"]: rp_6c6f67696e2e4c4f47494e5f4d4554484f445f4d41524b4552(), ["READY_PROMPT_MARKER"]: rp_6c6f67696e2e52454144595f50524f4d50545f4d41524b4552(), ["TERMINAL_RETENTION_SECS"]: rp_6c6f67696e2e5445524d494e414c5f524554454e54494f4e5f53454353(), ["Outcome"]: Object.freeze({ ["Authorized"]: ml_make_Outcome_Authorized, ["Failed"]: ml_make_Outcome_Failed }), ["FoundCredential"]: ml_make_FoundCredential_FoundCredential };
export const provenance = {"sourcePath":"src/login.rs","sourceSha256":"fbe7b5cbe73c68dfe53ed0c8b0f343595ed100de9f7175fcd240d69d83b6c0c5","executable":9,"executableFunctions":0,"executableConstants":7,"executableTypes":2,"executableConstructors":3,"carried":29,"preserved":39,"runtimeParity":false};
