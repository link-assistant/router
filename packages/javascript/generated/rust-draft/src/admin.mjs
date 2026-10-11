// Generated draft from src/admin.rs; sha256=6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e
// Carried constructs are data, never runtime parity evidence.
function rp_61646d696e2e41444d494e5f544f4b454e5f505245464958() {
  return "la_admin_";
}

function rp_61646d696e2e434c41494d5f46494c455f4e414d45() {
  return "admin-claim.json";
}

function rp_61646d696e2e434c41494d5f544f4b454e5f4c4142454c() {
  return "first-visitor-admin";
}

function ml_make_ClaimError_AlreadyClaimed() {
  return Object.freeze({ $: 'AlreadyClaimed' });
}

function ml_make_ClaimError_ProvisionedByEnvironment() {
  return Object.freeze({ $: 'ProvisionedByEnvironment' });
}

function ml_make_ClaimError_NoCandidate() {
  return Object.freeze({ $: 'NoCandidate' });
}

function ml_make_ClaimError_ClaimIdMismatch() {
  return Object.freeze({ $: 'ClaimIdMismatch' });
}

function ml_make_ClaimError_TokenMismatch() {
  return Object.freeze({ $: 'TokenMismatch' });
}

function ml_make_ClaimError_Storage() {
  return Object.freeze({ $: 'Storage' });
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

export const translated = { ["ADMIN_TOKEN_PREFIX"]: rp_61646d696e2e41444d494e5f544f4b454e5f505245464958(), ["CLAIM_FILE_NAME"]: rp_61646d696e2e434c41494d5f46494c455f4e414d45(), ["CLAIM_TOKEN_LABEL"]: rp_61646d696e2e434c41494d5f544f4b454e5f4c4142454c(), ["ClaimError"]: Object.freeze({ ["AlreadyClaimed"]: ml_make_ClaimError_AlreadyClaimed, ["ProvisionedByEnvironment"]: ml_make_ClaimError_ProvisionedByEnvironment, ["NoCandidate"]: ml_make_ClaimError_NoCandidate, ["ClaimIdMismatch"]: ml_make_ClaimError_ClaimIdMismatch, ["TokenMismatch"]: ml_make_ClaimError_TokenMismatch, ["Storage"]: ml_make_ClaimError_Storage }) };
export const provenance = {"sourcePath":"src/admin.rs","sourceSha256":"6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e","executable":4,"executableFunctions":0,"executableConstants":3,"executableTypes":1,"executableConstructors":6,"carried":34,"preserved":39,"runtimeParity":false};
