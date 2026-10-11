// Generated draft from src/github_proxy.rs; sha256=3c65440f41bef37e9f55641ae298a8083884a42cffa9797e6c8ab40e81ef4e37
// Carried constructs are data, never runtime parity evidence.
function rp_6769746875625f70726f78792e504f4c4943595f484541444552() {
  return "x-link-assistant-policy";
}

function ml_make_PolicyDecision_Allow() {
  return Object.freeze({ $: 'Allow' });
}

function ml_make_PolicyDecision_Deny() {
  return Object.freeze({ $: 'Deny' });
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

export const translated = { ["POLICY_HEADER"]: rp_6769746875625f70726f78792e504f4c4943595f484541444552(), ["PolicyDecision"]: Object.freeze({ ["Allow"]: ml_make_PolicyDecision_Allow, ["Deny"]: ml_make_PolicyDecision_Deny }) };
export const provenance = {"sourcePath":"src/github_proxy.rs","sourceSha256":"3c65440f41bef37e9f55641ae298a8083884a42cffa9797e6c8ab40e81ef4e37","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":2,"carried":41,"preserved":44,"runtimeParity":false};
