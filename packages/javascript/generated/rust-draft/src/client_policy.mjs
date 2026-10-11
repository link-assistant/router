// Generated draft from src/client_policy.rs; sha256=65fe77ca79296f5335a57ebc134c57b5b343a8762d9ca8faaef52d90a9b71bfb
// Carried constructs are data, never runtime parity evidence.
function PROXIED_CLIENT_EVIDENCE_HEADER() {
  return "x-link-assistant-proxied-client";
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

function PROXIED_CODEX_EVIDENCE_VALUE() {
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

function ml_make_RequestEvidence_Native() {
  return Object.freeze({ $: 'Native' });
}

function ml_make_RequestEvidence_Proxied() {
  return Object.freeze({ $: 'Proxied' });
}

function ml_make_RequestEvidence_Denied() {
  return Object.freeze({ $: 'Denied' });
}

export const translated = { ["PROXIED_CLIENT_EVIDENCE_HEADER"]: PROXIED_CLIENT_EVIDENCE_HEADER(), ["PROXIED_CODEX_EVIDENCE_VALUE"]: PROXIED_CODEX_EVIDENCE_VALUE(), ["EntitlementDecision"]: Object.freeze({ ["Native"]: ml_make_EntitlementDecision_Native, ["Proxied"]: ml_make_EntitlementDecision_Proxied, ["Override"]: ml_make_EntitlementDecision_Override, ["Denied"]: ml_make_EntitlementDecision_Denied }), ["RequestEvidence"]: Object.freeze({ ["Native"]: ml_make_RequestEvidence_Native, ["Proxied"]: ml_make_RequestEvidence_Proxied, ["Denied"]: ml_make_RequestEvidence_Denied }) };
export const provenance = {"sourcePath":"src/client_policy.rs","sourceSha256":"65fe77ca79296f5335a57ebc134c57b5b343a8762d9ca8faaef52d90a9b71bfb","executable":4,"executableFunctions":0,"executableConstants":2,"executableTypes":2,"executableConstructors":7,"carried":25,"preserved":30,"runtimeParity":false};
