// Generated draft from src/credential_acceptance_tests.rs; sha256=366cf13d87f47e43da00ba3b538d17db1add12518f97f95f1def15d430809b16
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
};

const serde_json = {
  error: {

  },
};

function is_inference_path(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return ((path.includes("messages") || path.includes("responses")) || path.includes("chat/completions"));
}

export const translated = { ["CatalogReply"]: Object.freeze({ ["Accepted"]: ml_make_CatalogReply_Accepted, ["Unauthorized"]: ml_make_CatalogReply_Unauthorized, ["Unavailable"]: ml_make_CatalogReply_Unavailable, ["Malformed"]: ml_make_CatalogReply_Malformed, ["Empty"]: ml_make_CatalogReply_Empty, ["Timeout"]: ml_make_CatalogReply_Timeout }), ["is_inference_path"]: is_inference_path };
export const provenance = {"sourcePath":"src/credential_acceptance_tests.rs","sourceSha256":"366cf13d87f47e43da00ba3b538d17db1add12518f97f95f1def15d430809b16","executable":2,"executableFunctions":1,"executableConstants":0,"executableTypes":1,"executableConstructors":6,"carried":18,"preserved":20,"runtimeParity":false};
