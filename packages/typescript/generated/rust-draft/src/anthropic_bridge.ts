// Generated draft from src/anthropic_bridge.rs; sha256=a056980f8dd5de2108eaa716fc230eb7a2016e9f4c34df62fb9ea33c308ab501
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_MAX_TOKENS() {
  return 4096n;
}

function unrepresentable_responses_output(kind: string) {
  return (("Responses output item type " + kind) + " cannot be represented by Anthropic");
}

export const translated: { "DEFAULT_MAX_TOKENS": bigint; "unrepresentable_responses_output": (kind: string) => string } = { "DEFAULT_MAX_TOKENS": DEFAULT_MAX_TOKENS(), unrepresentable_responses_output };
export const provenance = {"sourcePath":"src/anthropic_bridge.rs","sourceSha256":"a056980f8dd5de2108eaa716fc230eb7a2016e9f4c34df62fb9ea33c308ab501","executable":2,"carried":32,"preserved":35,"runtimeParity":false};
