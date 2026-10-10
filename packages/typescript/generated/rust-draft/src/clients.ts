// Generated draft from src/clients.rs; sha256=2f12c5aa34a65ec62b793902cdefe8f36c1b6c414c673e6499ef40c7dbfb8c2d
// Carried constructs are data, never runtime parity evidence.
function CODEX_PROVIDER() {
  return "link-assistant";
}

function CODEX_TOKEN_ENV() {
  return "LINK_ASSISTANT_TOKEN";
}

function CLAUDE_TOKEN_ENV() {
  return "ANTHROPIC_AUTH_TOKEN";
}

function CLAUDE_BASE_ENV() {
  return "ANTHROPIC_BASE_URL";
}

function ROUTER_TOKEN_ENV() {
  return "LINK_ASSISTANT_TOKEN";
}

function GROK_TOKEN_ENV() {
  return "GROK_API_KEY";
}

function GROK_BASE_ENV() {
  return "GROK_BASE_URL";
}

function ROUTER_PROVIDER() {
  return "link-assistant";
}

function OWNERSHIP_MARKER() {
  return ".link-assistant-router-client.json";
}

function OPENAI_MODEL_OWNER() {
  return "openai";
}

function ANTHROPIC_MODEL_OWNER() {
  return "anthropic";
}

function GOOGLE_MODEL_OWNER() {
  return "google";
}

function QWEN_MODEL_OWNER() {
  return "qwen";
}

function ZAI_MODEL_OWNER() {
  return "z.ai";
}

function DEFAULT_OPENAI_REASONING_EFFORT() {
  return "xhigh";
}

function DOCTOR_MAX_TOKENS() {
  return 64n;
}

function DEFAULT_ANTHROPIC_REASONING_EFFORT() {
  return "high";
}

export const translated: { "CODEX_PROVIDER": string; "CODEX_TOKEN_ENV": string; "CLAUDE_TOKEN_ENV": string; "CLAUDE_BASE_ENV": string; "ROUTER_TOKEN_ENV": string; "GROK_TOKEN_ENV": string; "GROK_BASE_ENV": string; "ROUTER_PROVIDER": string; "OWNERSHIP_MARKER": string; "OPENAI_MODEL_OWNER": string; "ANTHROPIC_MODEL_OWNER": string; "GOOGLE_MODEL_OWNER": string; "QWEN_MODEL_OWNER": string; "ZAI_MODEL_OWNER": string; "DEFAULT_OPENAI_REASONING_EFFORT": string; "DOCTOR_MAX_TOKENS": bigint; "DEFAULT_ANTHROPIC_REASONING_EFFORT": string } = { "CODEX_PROVIDER": CODEX_PROVIDER(), "CODEX_TOKEN_ENV": CODEX_TOKEN_ENV(), "CLAUDE_TOKEN_ENV": CLAUDE_TOKEN_ENV(), "CLAUDE_BASE_ENV": CLAUDE_BASE_ENV(), "ROUTER_TOKEN_ENV": ROUTER_TOKEN_ENV(), "GROK_TOKEN_ENV": GROK_TOKEN_ENV(), "GROK_BASE_ENV": GROK_BASE_ENV(), "ROUTER_PROVIDER": ROUTER_PROVIDER(), "OWNERSHIP_MARKER": OWNERSHIP_MARKER(), "OPENAI_MODEL_OWNER": OPENAI_MODEL_OWNER(), "ANTHROPIC_MODEL_OWNER": ANTHROPIC_MODEL_OWNER(), "GOOGLE_MODEL_OWNER": GOOGLE_MODEL_OWNER(), "QWEN_MODEL_OWNER": QWEN_MODEL_OWNER(), "ZAI_MODEL_OWNER": ZAI_MODEL_OWNER(), "DEFAULT_OPENAI_REASONING_EFFORT": DEFAULT_OPENAI_REASONING_EFFORT(), "DOCTOR_MAX_TOKENS": DOCTOR_MAX_TOKENS(), "DEFAULT_ANTHROPIC_REASONING_EFFORT": DEFAULT_ANTHROPIC_REASONING_EFFORT() };
export const provenance = {"sourcePath":"src/clients.rs","sourceSha256":"2f12c5aa34a65ec62b793902cdefe8f36c1b6c414c673e6499ef40c7dbfb8c2d","executable":17,"executableFunctions":0,"executableConstants":17,"carried":44,"preserved":62,"runtimeParity":false};
