// Generated draft from rust/src/responses_websocket/thinking.rs; sha256=d3db5e6059e27e29f820f7626437df738cde9bd4aef9a50aa05f16c3027287a9
// Carried constructs are data, never runtime parity evidence.
function ml_make_AccountScope_AccountScope(account, base_url) {
  if (!(typeof account === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(account))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof base_url === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(base_url))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "AccountScope", ["account"]: account, ["base_url"]: base_url });
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

export const translated = { ["AccountScope"]: ml_make_AccountScope_AccountScope };
export const provenance = {"sourcePath":"rust/src/responses_websocket/thinking.rs","sourceSha256":"d3db5e6059e27e29f820f7626437df738cde9bd4aef9a50aa05f16c3027287a9","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":7,"preserved":9,"runtimeParity":false};
