// Generated draft from src/account_routing_policy.rs; sha256=64d863e769dc0dc64d81868e88bb0ab0a6dd45f3d09be61bade739a18fd13d92
// Carried constructs are data, never runtime parity evidence.
function POLICY_FILE() {
  return "routing-policy.json";
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
};

const serde_json = {
  error: {

  },
};

function MAX_WEIGHT() {
  return 1000000n;
}

function MAX_RETRIES() {
  return 100n;
}

function COPY_HEADER_ALLOW_LIST() {
  return Object.freeze(["x-request-id", "x-correlation-id", "traceparent", "tracestate", "x-claude-code-session-id", "x-codex-session-id", "x-session-id", "session-id"]);
}

export const translated = { ["POLICY_FILE"]: POLICY_FILE(), ["MAX_WEIGHT"]: MAX_WEIGHT(), ["MAX_RETRIES"]: MAX_RETRIES(), ["COPY_HEADER_ALLOW_LIST"]: COPY_HEADER_ALLOW_LIST() };
export const provenance = {"sourcePath":"src/account_routing_policy.rs","sourceSha256":"64d863e769dc0dc64d81868e88bb0ab0a6dd45f3d09be61bade739a18fd13d92","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":12,"preserved":17,"runtimeParity":false};
