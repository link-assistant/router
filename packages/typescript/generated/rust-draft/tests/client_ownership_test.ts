// Generated draft from tests/client_ownership_test.rs; sha256=1a83b2b1ad00abe5d46348d07d56e78e0d0e46f7b37583c0c61e5fe4d9bf7b5d
// Carried constructs are data, never runtime parity evidence.
function helper_claude_settings() {
  return "{\n  \"permissions\": {\"allow\": [\"Read\"]},\n  \"env\": {\n    \"ANTHROPIC_AUTH_TOKEN\": \"z.ai-secret-that-must-never-be-reported\",\n    \"ANTHROPIC_BASE_URL\": \"https://api.z.ai/api/anthropic\",\n    \"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC\": \"1\",\n    \"ANTHROPIC_DEFAULT_OPUS_MODEL\": \"future-helper-pin\",\n    \"CLAUDE_CODE_MAX_OUTPUT_CHARS\": \"50000\"\n  }\n}";
}

export const translated: { "helper_claude_settings": () => string } = { helper_claude_settings };
export const provenance = {"sourcePath":"tests/client_ownership_test.rs","sourceSha256":"1a83b2b1ad00abe5d46348d07d56e78e0d0e46f7b37583c0c61e5fe4d9bf7b5d","executable":1,"executableFunctions":1,"executableConstants":0,"carried":9,"preserved":11,"runtimeParity":false};
