// Generated draft from tests/deploy_seed_test.rs; sha256=aced16a28d3413bc430c37bf2aa224af193e0c93fc9fad53eccc5f7ff4c33fb3
// Carried constructs are data, never runtime parity evidence.
function SECRET() {
  return "deploy-seed-test-signing-secret";
}

function CLAUDE_REFRESH() {
  return "sk-ant-ort01-claude-refresh-never-in-argv";
}

function CODEX_REFRESH() {
  return "codex-refresh-never-in-argv";
}

function SERVER() {
  return "deploy@seed.example";
}

export const translated: { "SECRET": string; "CLAUDE_REFRESH": string; "CODEX_REFRESH": string; "SERVER": string } = { "SECRET": SECRET(), "CLAUDE_REFRESH": CLAUDE_REFRESH(), "CODEX_REFRESH": CODEX_REFRESH(), "SERVER": SERVER() };
export const provenance = {"sourcePath":"tests/deploy_seed_test.rs","sourceSha256":"aced16a28d3413bc430c37bf2aa224af193e0c93fc9fad53eccc5f7ff4c33fb3","executable":4,"executableFunctions":0,"executableConstants":4,"carried":18,"preserved":23,"runtimeParity":false};
