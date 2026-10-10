// Generated draft from src/refresh.rs; sha256=dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: any, min: any, max: any, message: any) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function CLAUDE_OAUTH_USER_AGENT() {
  return "anthropic-sdk-typescript/0.112.1 userOAuthProvider";
}

function ANTHROPIC_SDK_VERSION() {
  return "0.112.1";
}

function GEMINI_CLI_VERSION() {
  return "0.59.0";
}

function GOOGLE_AUTH_LIBRARY_VERSION() {
  return "10.9.0";
}

function QWEN_CODE_VERSION() {
  return "0.23.1";
}

function GEMINI_CLIENT_ID_ENV() {
  return "GEMINI_OAUTH_CLIENT_ID";
}

function GEMINI_CLIENT_SECRET_ENV() {
  return "GEMINI_OAUTH_CLIENT_SECRET";
}

function GEMINI_CLIENT_ID() {
  return "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";
}

function GEMINI_AUTH_USER_AGENT() {
  return "google-api-nodejs-client/10.9.0";
}

function GEMINI_API_CLIENT() {
  return "gl-node/22.14.0";
}

function CLAUDE_CLIENT_ID() {
  return "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
}

function CLAUDE_TOKEN_URL() {
  return "https://platform.claude.com/v1/oauth/token";
}

function REFRESH_SKEW_MS() {
  return ml_fixed((5n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function ROTATION_ATTRIBUTION_MS() {
  return ml_fixed((60n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

export const translated: { "CLAUDE_OAUTH_USER_AGENT": string; "ANTHROPIC_SDK_VERSION": string; "GEMINI_CLI_VERSION": string; "GOOGLE_AUTH_LIBRARY_VERSION": string; "QWEN_CODE_VERSION": string; "GEMINI_CLIENT_ID_ENV": string; "GEMINI_CLIENT_SECRET_ENV": string; "GEMINI_CLIENT_ID": string; "GEMINI_AUTH_USER_AGENT": string; "GEMINI_API_CLIENT": string; "CLAUDE_CLIENT_ID": string; "CLAUDE_TOKEN_URL": string; "REFRESH_SKEW_MS": bigint; "ROTATION_ATTRIBUTION_MS": bigint } = { "CLAUDE_OAUTH_USER_AGENT": CLAUDE_OAUTH_USER_AGENT(), "ANTHROPIC_SDK_VERSION": ANTHROPIC_SDK_VERSION(), "GEMINI_CLI_VERSION": GEMINI_CLI_VERSION(), "GOOGLE_AUTH_LIBRARY_VERSION": GOOGLE_AUTH_LIBRARY_VERSION(), "QWEN_CODE_VERSION": QWEN_CODE_VERSION(), "GEMINI_CLIENT_ID_ENV": GEMINI_CLIENT_ID_ENV(), "GEMINI_CLIENT_SECRET_ENV": GEMINI_CLIENT_SECRET_ENV(), "GEMINI_CLIENT_ID": GEMINI_CLIENT_ID(), "GEMINI_AUTH_USER_AGENT": GEMINI_AUTH_USER_AGENT(), "GEMINI_API_CLIENT": GEMINI_API_CLIENT(), "CLAUDE_CLIENT_ID": CLAUDE_CLIENT_ID(), "CLAUDE_TOKEN_URL": CLAUDE_TOKEN_URL(), "REFRESH_SKEW_MS": REFRESH_SKEW_MS(), "ROTATION_ATTRIBUTION_MS": ROTATION_ATTRIBUTION_MS() };
export const provenance = {"sourcePath":"src/refresh.rs","sourceSha256":"dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108","executable":14,"carried":52,"preserved":67,"runtimeParity":false};
