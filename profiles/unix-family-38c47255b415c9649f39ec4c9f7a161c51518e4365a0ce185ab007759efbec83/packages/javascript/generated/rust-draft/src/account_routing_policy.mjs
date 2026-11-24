// Generated draft from src/account_routing_policy.rs; sha256=64d863e769dc0dc64d81868e88bb0ab0a6dd45f3d09be61bade739a18fd13d92
// Carried constructs are data, never runtime parity evidence.
function rp_6163636f756e745f726f7574696e675f706f6c6963792e504f4c4943595f46494c45() {
  return "routing-policy.json";
}

function rp_6163636f756e745f726f7574696e675f706f6c6963792e4d41585f574549474854() {
  return 1000000n;
}

function rp_6163636f756e745f726f7574696e675f706f6c6963792e4d41585f52455452494553() {
  return 100n;
}

function rp_6163636f756e745f726f7574696e675f706f6c6963792e434f50595f4845414445525f414c4c4f575f4c495354() {
  return Object.freeze(Object.freeze(["x-request-id", "x-correlation-id", "traceparent", "tracestate", "x-claude-code-session-id", "x-codex-session-id", "x-session-id", "session-id"]));
}

export const translated = { ["POLICY_FILE"]: rp_6163636f756e745f726f7574696e675f706f6c6963792e504f4c4943595f46494c45(), ["MAX_WEIGHT"]: rp_6163636f756e745f726f7574696e675f706f6c6963792e4d41585f574549474854(), ["MAX_RETRIES"]: rp_6163636f756e745f726f7574696e675f706f6c6963792e4d41585f52455452494553(), ["COPY_HEADER_ALLOW_LIST"]: rp_6163636f756e745f726f7574696e675f706f6c6963792e434f50595f4845414445525f414c4c4f575f4c495354() };
export const provenance = {"sourcePath":"src/account_routing_policy.rs","sourceSha256":"64d863e769dc0dc64d81868e88bb0ab0a6dd45f3d09be61bade739a18fd13d92","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":12,"preserved":17,"runtimeParity":false};
