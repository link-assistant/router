// Generated draft from src/account_routing_policy.rs; sha256=64d863e769dc0dc64d81868e88bb0ab0a6dd45f3d09be61bade739a18fd13d92
// Carried constructs are data, never runtime parity evidence.
function POLICY_FILE() {
  return "routing-policy.json";
}

function MAX_WEIGHT() {
  return 1000000n;
}

function MAX_RETRIES() {
  return 100n;
}

export const translated: { "POLICY_FILE": string; "MAX_WEIGHT": bigint; "MAX_RETRIES": bigint } = { "POLICY_FILE": POLICY_FILE(), "MAX_WEIGHT": MAX_WEIGHT(), "MAX_RETRIES": MAX_RETRIES() };
export const provenance = {"sourcePath":"src/account_routing_policy.rs","sourceSha256":"64d863e769dc0dc64d81868e88bb0ab0a6dd45f3d09be61bade739a18fd13d92","executable":3,"executableFunctions":0,"executableConstants":3,"carried":13,"preserved":17,"runtimeParity":false};
