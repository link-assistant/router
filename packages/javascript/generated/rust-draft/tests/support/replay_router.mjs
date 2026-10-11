// Generated draft from tests/support/replay_router.rs; sha256=24744847e28b7f55d6227843170379d3f83424b06bd98964b91b55567ffc4db3
// Carried constructs are data, never runtime parity evidence.
function BRIDGE_MODEL() {
  return "gpt-5-2025-08-07";
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

function ml_make_Surface_AnthropicMessages() {
  return Object.freeze({ $: 'AnthropicMessages' });
}

function ml_make_Surface_AnthropicCountTokens() {
  return Object.freeze({ $: 'AnthropicCountTokens' });
}

function ml_make_Surface_OpenAIChat() {
  return Object.freeze({ $: 'OpenAIChat' });
}

function ml_make_Surface_OpenAIResponses() {
  return Object.freeze({ $: 'OpenAIResponses' });
}

function ml_make_Surface_CodexResponses() {
  return Object.freeze({ $: 'CodexResponses' });
}

export const translated = { ["BRIDGE_MODEL"]: BRIDGE_MODEL(), ["Surface"]: Object.freeze({ ["AnthropicMessages"]: ml_make_Surface_AnthropicMessages, ["AnthropicCountTokens"]: ml_make_Surface_AnthropicCountTokens, ["OpenAIChat"]: ml_make_Surface_OpenAIChat, ["OpenAIResponses"]: ml_make_Surface_OpenAIResponses, ["CodexResponses"]: ml_make_Surface_CodexResponses }) };
export const provenance = {"sourcePath":"tests/support/replay_router.rs","sourceSha256":"24744847e28b7f55d6227843170379d3f83424b06bd98964b91b55567ffc4db3","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":5,"carried":42,"preserved":45,"runtimeParity":false};
