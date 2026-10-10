// Generated draft from tests/pool_failover_test.rs; sha256=df74056a7701c52917aa9d4d54c1e582091c2e9dcf3ce0f09f3746157e06755d
// Carried constructs are data, never runtime parity evidence.
function MESSAGES() {
  return "/api/services/anthropic/v1/messages";
}

function COUNT_TOKENS() {
  return "/api/services/anthropic/v1/messages/count_tokens";
}

function CODEX_RESPONSES() {
  return "/api/services/codex/v1/responses";
}

function ADMIN_KEY() {
  return "pool-admin";
}

function CUT_TEXT_CHARS() {
  return 400n;
}

export const translated: { "MESSAGES": string; "COUNT_TOKENS": string; "CODEX_RESPONSES": string; "ADMIN_KEY": string; "CUT_TEXT_CHARS": bigint } = { "MESSAGES": MESSAGES(), "COUNT_TOKENS": COUNT_TOKENS(), "CODEX_RESPONSES": CODEX_RESPONSES(), "ADMIN_KEY": ADMIN_KEY(), "CUT_TEXT_CHARS": CUT_TEXT_CHARS() };
export const provenance = {"sourcePath":"tests/pool_failover_test.rs","sourceSha256":"df74056a7701c52917aa9d4d54c1e582091c2e9dcf3ce0f09f3746157e06755d","executable":5,"carried":56,"preserved":62,"runtimeParity":false};
