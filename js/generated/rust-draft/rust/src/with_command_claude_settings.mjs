// Generated draft from rust/src/with_command_claude_settings.rs; sha256=a4319f22c0031d6a8c4fb17c90d161ae815f7a8f4b733cbb56e5863711bcbdaf
// Carried constructs are data, never runtime parity evidence.
function ml_make_ClaudeModelSelection_ClaudeModelSelection(model, reason) {
  if (!(typeof model === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(model))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ClaudeModelSelection", ["model"]: model, ["reason"]: reason });
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

function rp_776974685f636f6d6d616e642e636c617564655f73657474696e67732e4c4153545f574f524b494e475f4d4f44454c() {
  return "router-last-working-model";
}

export const translated = { ["ClaudeModelSelection"]: ml_make_ClaudeModelSelection_ClaudeModelSelection, ["LAST_WORKING_MODEL"]: rp_776974685f636f6d6d616e642e636c617564655f73657474696e67732e4c4153545f574f524b494e475f4d4f44454c() };
export const provenance = {"sourcePath":"rust/src/with_command_claude_settings.rs","sourceSha256":"a4319f22c0031d6a8c4fb17c90d161ae815f7a8f4b733cbb56e5863711bcbdaf","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":16,"preserved":19,"runtimeParity":false};
