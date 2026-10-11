
// Generated draft from src/account_routing_policy.rs; sha256=64d863e769dc0dc64d81868e88bb0ab0a6dd45f3d09be61bade739a18fd13d92
// Carried constructs are data, never runtime parity evidence.
function rp_6163636f756e745f726f7574696e675f706f6c6963792e504f4c4943595f46494c45(): string {
  return "routing-policy.json";
}

function rp_6163636f756e745f726f7574696e675f706f6c6963792e434f50595f4845414445525f414c4c4f575f4c495354(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["x-request-id", "x-correlation-id", "traceparent", "tracestate", "x-claude-code-session-id", "x-codex-session-id", "x-session-id", "session-id"]));
}

export const translated: { "POLICY_FILE": string; "COPY_HEADER_ALLOW_LIST": ReadonlyArray<string> } = { ["POLICY_FILE"]: rp_6163636f756e745f726f7574696e675f706f6c6963792e504f4c4943595f46494c45(), ["COPY_HEADER_ALLOW_LIST"]: rp_6163636f756e745f726f7574696e675f706f6c6963792e434f50595f4845414445525f414c4c4f575f4c495354() };
export const provenance = {"sourcePath":"src/account_routing_policy.rs","sourceSha256":"64d863e769dc0dc64d81868e88bb0ab0a6dd45f3d09be61bade739a18fd13d92","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":14,"preserved":17,"runtimeParity":false};
