// Generated draft from src/thinking/anthropic.rs; sha256=5f70c30a7f886ba0de83049872f598e3c18c9f5e9f5d2b070cbc9252d52aa2da
// Carried constructs are data, never runtime parity evidence.
function CLAUDE_DEFAULT_MAX_TOKENS() {
  return 8192n;
}

function CLAUDE_MIN_THINKING_BUDGET() {
  return 1024n;
}

function CLAUDE_OUTPUT_HEADROOM() {
  return 8192n;
}

function CLAUDE_OUTPUT_FLOOR() {
  return 4096n;
}

function CLAUDE_FIXED_TOKEN_CEILING() {
  return 32000n;
}

function CLAUDE_ADAPTIVE_TOKEN_CEILING() {
  return 40192n;
}

export const translated: { "CLAUDE_DEFAULT_MAX_TOKENS": bigint; "CLAUDE_MIN_THINKING_BUDGET": bigint; "CLAUDE_OUTPUT_HEADROOM": bigint; "CLAUDE_OUTPUT_FLOOR": bigint; "CLAUDE_FIXED_TOKEN_CEILING": bigint; "CLAUDE_ADAPTIVE_TOKEN_CEILING": bigint } = { "CLAUDE_DEFAULT_MAX_TOKENS": CLAUDE_DEFAULT_MAX_TOKENS(), "CLAUDE_MIN_THINKING_BUDGET": CLAUDE_MIN_THINKING_BUDGET(), "CLAUDE_OUTPUT_HEADROOM": CLAUDE_OUTPUT_HEADROOM(), "CLAUDE_OUTPUT_FLOOR": CLAUDE_OUTPUT_FLOOR(), "CLAUDE_FIXED_TOKEN_CEILING": CLAUDE_FIXED_TOKEN_CEILING(), "CLAUDE_ADAPTIVE_TOKEN_CEILING": CLAUDE_ADAPTIVE_TOKEN_CEILING() };
export const provenance = {"sourcePath":"src/thinking/anthropic.rs","sourceSha256":"5f70c30a7f886ba0de83049872f598e3c18c9f5e9f5d2b070cbc9252d52aa2da","executable":6,"carried":6,"preserved":13,"runtimeParity":false};
