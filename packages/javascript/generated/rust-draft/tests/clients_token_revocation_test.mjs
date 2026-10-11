// Generated draft from tests/clients_token_revocation_test.rs; sha256=8444db6d70f528989a09f023a94a6434eee4afc9ff7dc5db1255b41ebd10767a
// Carried constructs are data, never runtime parity evidence.
import { copyFixedArray as ml_copy_fixed_array } from "../runtime/fixed-array-runtime.mjs";

function SUPPORTED() {
  return ml_copy_fixed_array(["codex", "claude", "opencode", "qwen", "agent", "grok"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":6}});
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

function needs_catalog(client) {
  if (!(typeof client === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(client))) throw new TypeError('argument outside supported Rust value domain');
  const ml_ordered_match_1 = client;
  return (() => {
    if ((ml_ordered_match_1 === "claude")) {
      return true;
    }
    if ((ml_ordered_match_1 === "opencode")) {
      return true;
    }
    if ((ml_ordered_match_1 === "qwen")) {
      return true;
    }
    if ((ml_ordered_match_1 === "agent")) {
      return true;
    }
    if (true) {
      return false;
    }
    throw new Error("unreachable exhaustive ordered match");
  })();
}

function BACKENDS() {
  return ml_copy_fixed_array(["text", "binary"], {"kind":"array","element":{"kind":"string"},"rustFixedArray":{"length":2}});
}

export const translated = { ["SUPPORTED"]: SUPPORTED(), ["needs_catalog"]: needs_catalog, ["BACKENDS"]: BACKENDS() };
export const provenance = {"sourcePath":"tests/clients_token_revocation_test.rs","sourceSha256":"8444db6d70f528989a09f023a94a6434eee4afc9ff7dc5db1255b41ebd10767a","executable":3,"executableFunctions":1,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":31,"preserved":35,"runtimeParity":false};
