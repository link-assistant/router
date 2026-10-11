// Generated draft from src/subscription_proxy.rs; sha256=81f8da312fbf38ab533308902555ff9df375447a3aaadf8914a7d26b21c878bb
// Carried constructs are data, never runtime parity evidence.
function CODEX_RESPONSES_LITE_HEADER() {
  return "x-openai-internal-codex-responses-lite";
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

function ml_make_CodexResponsesMode_Standard() {
  return Object.freeze({ $: 'Standard' });
}

function ml_make_CodexResponsesMode_Lite() {
  return Object.freeze({ $: 'Lite' });
}

function ml_make_SubscriptionResponseShape_Passthrough() {
  return Object.freeze({ $: 'Passthrough' });
}

function ml_make_SubscriptionResponseShape_ChatCompletion() {
  return Object.freeze({ $: 'ChatCompletion' });
}

export const translated = { ["CODEX_RESPONSES_LITE_HEADER"]: CODEX_RESPONSES_LITE_HEADER(), ["CodexResponsesMode"]: Object.freeze({ ["Standard"]: ml_make_CodexResponsesMode_Standard, ["Lite"]: ml_make_CodexResponsesMode_Lite }), ["SubscriptionResponseShape"]: Object.freeze({ ["Passthrough"]: ml_make_SubscriptionResponseShape_Passthrough, ["ChatCompletion"]: ml_make_SubscriptionResponseShape_ChatCompletion }) };
export const provenance = {"sourcePath":"src/subscription_proxy.rs","sourceSha256":"81f8da312fbf38ab533308902555ff9df375447a3aaadf8914a7d26b21c878bb","executable":3,"executableFunctions":0,"executableConstants":1,"executableTypes":2,"executableConstructors":4,"carried":28,"preserved":32,"runtimeParity":false};
