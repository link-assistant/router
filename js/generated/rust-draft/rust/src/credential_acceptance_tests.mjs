// Generated draft from rust/src/credential_acceptance_tests.rs; sha256=366cf13d87f47e43da00ba3b538d17db1add12518f97f95f1def15d430809b16
// Carried constructs are data, never runtime parity evidence.
function ml_make_CatalogReply_Accepted() {
  return Object.freeze({ $: 'Accepted' });
}

function ml_make_CatalogReply_Unauthorized() {
  return Object.freeze({ $: 'Unauthorized' });
}

function ml_make_CatalogReply_Unavailable() {
  return Object.freeze({ $: 'Unavailable' });
}

function ml_make_CatalogReply_Malformed() {
  return Object.freeze({ $: 'Malformed' });
}

function ml_make_CatalogReply_Empty() {
  return Object.freeze({ $: 'Empty' });
}

function ml_make_CatalogReply_Timeout() {
  return Object.freeze({ $: 'Timeout' });
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

export const translated = { ["CatalogReply"]: Object.freeze({ ["Accepted"]: ml_make_CatalogReply_Accepted, ["Unauthorized"]: ml_make_CatalogReply_Unauthorized, ["Unavailable"]: ml_make_CatalogReply_Unavailable, ["Malformed"]: ml_make_CatalogReply_Malformed, ["Empty"]: ml_make_CatalogReply_Empty, ["Timeout"]: ml_make_CatalogReply_Timeout }) };
export const provenance = {"sourcePath":"rust/src/credential_acceptance_tests.rs","sourceSha256":"366cf13d87f47e43da00ba3b538d17db1add12518f97f95f1def15d430809b16","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":6,"carried":19,"preserved":20,"runtimeParity":false};
