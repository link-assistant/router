// Generated draft from tests/real_clients_test.rs; sha256=fd2e46770b1877b0ef247986c5537a0a7ae3d121034ecc86416ce8cb1aca74d5
// Carried constructs are data, never runtime parity evidence.
function PROMPT() {
  return "Reply with exactly ROUTER_CAPTURE_OK";
}

function SUBAGENT_PROMPT() {
  return "Use the Agent tool once, then reply ROUTER_CAPTURE_OK.";
}

function ANSWER() {
  return "ROUTER_CAPTURE_OK";
}

function CODEX_ALTERNATE_MODEL() {
  return "future-codex-switch-model";
}

export const translated = { "PROMPT": PROMPT(), "SUBAGENT_PROMPT": SUBAGENT_PROMPT(), "ANSWER": ANSWER(), "CODEX_ALTERNATE_MODEL": CODEX_ALTERNATE_MODEL() };
export const provenance = {"sourcePath":"tests/real_clients_test.rs","sourceSha256":"fd2e46770b1877b0ef247986c5537a0a7ae3d121034ecc86416ce8cb1aca74d5","executable":4,"carried":55,"preserved":60,"runtimeParity":false};
