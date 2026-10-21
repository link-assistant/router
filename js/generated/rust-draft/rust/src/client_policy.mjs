// Generated draft from rust/src/client_policy.rs; sha256=65fe77ca79296f5335a57ebc134c57b5b343a8762d9ca8faaef52d90a9b71bfb
// Carried constructs are data, never runtime parity evidence.
function rp_636c69656e745f706f6c6963792e50524f584945445f434c49454e545f45564944454e43455f484541444552() {
  return "x-link-assistant-proxied-client";
}

function rp_636c69656e745f706f6c6963792e50524f584945445f434f4445585f45564944454e43455f56414c5545() {
  return "codex";
}

function ml_make_EntitlementDecision_Native() {
  return Object.freeze({ $: 'Native' });
}

function ml_make_EntitlementDecision_Proxied() {
  return Object.freeze({ $: 'Proxied' });
}

function ml_make_EntitlementDecision_Override() {
  return Object.freeze({ $: 'Override' });
}

function ml_make_EntitlementDecision_Denied() {
  return Object.freeze({ $: 'Denied' });
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

function ml_make_RequestEvidence_Native() {
  return Object.freeze({ $: 'Native' });
}

function ml_make_RequestEvidence_Proxied() {
  return Object.freeze({ $: 'Proxied' });
}

function ml_make_RequestEvidence_Denied() {
  return Object.freeze({ $: 'Denied' });
}

export const translated = { ["PROXIED_CLIENT_EVIDENCE_HEADER"]: rp_636c69656e745f706f6c6963792e50524f584945445f434c49454e545f45564944454e43455f484541444552(), ["PROXIED_CODEX_EVIDENCE_VALUE"]: rp_636c69656e745f706f6c6963792e50524f584945445f434f4445585f45564944454e43455f56414c5545(), ["EntitlementDecision"]: Object.freeze({ ["Native"]: ml_make_EntitlementDecision_Native, ["Proxied"]: ml_make_EntitlementDecision_Proxied, ["Override"]: ml_make_EntitlementDecision_Override, ["Denied"]: ml_make_EntitlementDecision_Denied }), ["RequestEvidence"]: Object.freeze({ ["Native"]: ml_make_RequestEvidence_Native, ["Proxied"]: ml_make_RequestEvidence_Proxied, ["Denied"]: ml_make_RequestEvidence_Denied }) };
export const provenance = {"sourcePath":"rust/src/client_policy.rs","sourceSha256":"65fe77ca79296f5335a57ebc134c57b5b343a8762d9ca8faaef52d90a9b71bfb","executable":4,"executableFunctions":0,"executableConstants":2,"executableTypes":2,"executableConstructors":7,"carried":25,"preserved":30,"runtimeParity":false};
