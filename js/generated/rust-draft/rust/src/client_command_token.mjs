// Generated draft from rust/src/client_command_token.rs; sha256=0fe39680b85aa8a19b905990a78020d38aaf900b2836c689e699adad638aa1cf
// Carried constructs are data, never runtime parity evidence.
function ml_make_LocalTokenBinding_LocalTokenBinding(token_id, principal_id) {
  if (!(typeof token_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token_id))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof principal_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(principal_id))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "LocalTokenBinding", ["token_id"]: token_id, ["principal_id"]: principal_id });
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

export const translated = { ["LocalTokenBinding"]: ml_make_LocalTokenBinding_LocalTokenBinding };
export const provenance = {"sourcePath":"rust/src/client_command_token.rs","sourceSha256":"0fe39680b85aa8a19b905990a78020d38aaf900b2836c689e699adad638aa1cf","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":10,"preserved":11,"runtimeParity":false};
