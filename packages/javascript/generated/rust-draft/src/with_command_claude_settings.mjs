// Generated draft from src/with_command_claude_settings.rs; sha256=a4319f22c0031d6a8c4fb17c90d161ae815f7a8f4b733cbb56e5863711bcbdaf
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

const serde_json = {
  error: {

  },
};

function LAST_WORKING_MODEL() {
  return "router-last-working-model";
}

export const translated = { ["ClaudeModelSelection"]: ml_make_ClaudeModelSelection_ClaudeModelSelection, ["LAST_WORKING_MODEL"]: LAST_WORKING_MODEL() };
export const provenance = {"sourcePath":"src/with_command_claude_settings.rs","sourceSha256":"a4319f22c0031d6a8c4fb17c90d161ae815f7a8f4b733cbb56e5863711bcbdaf","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":16,"preserved":19,"runtimeParity":false};
