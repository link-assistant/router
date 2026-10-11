// Generated draft from src/bridge_controls.rs; sha256=c4d0d6520eccf550be920e521860681172ffca2dc028fde5187434429d1f7b81
// Carried constructs are data, never runtime parity evidence.
function CHAT_FIELDS() {
  return Object.freeze(["model", "messages", "max_tokens", "max_completion_tokens", "temperature", "top_p", "frequency_penalty", "presence_penalty", "logit_bias", "seed", "stream", "stream_options", "stop", "tools", "tool_choice", "reasoning_effort", "reasoning", "response_format", "parallel_tool_calls", "n", "modalities", "audio", "logprobs", "top_logprobs", "safety_identifier", "service_tier", "prompt_cache_key", "prompt_cache_options", "prompt_cache_retention", "moderation", "prediction", "user"]);
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

function RESPONSE_FIELDS() {
  return Object.freeze(["model", "input", "instructions", "max_output_tokens", "temperature", "top_p", "stream", "tools", "tool_choice", "reasoning", "text", "parallel_tool_calls", "background", "max_tool_calls", "truncation", "store", "stream_options", "safety_identifier", "previous_response_id", "conversation", "service_tier", "prompt_cache_key", "prompt_cache_options", "prompt_cache_retention", "moderation", "metadata", "include", "prompt", "user", "context_management", "top_logprobs"]);
}

export const translated = { ["CHAT_FIELDS"]: CHAT_FIELDS(), ["RESPONSE_FIELDS"]: RESPONSE_FIELDS() };
export const provenance = {"sourcePath":"src/bridge_controls.rs","sourceSha256":"c4d0d6520eccf550be920e521860681172ffca2dc028fde5187434429d1f7b81","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":17,"preserved":20,"runtimeParity":false};
