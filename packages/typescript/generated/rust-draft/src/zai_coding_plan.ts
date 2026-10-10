// Generated draft from src/zai_coding_plan.rs; sha256=47c521e6806fa8d543d939fd6b1751fb48b180874322cf0699957c9c85b79aa2
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ANTHROPIC_BASE_PATH() {
  return "/api/anthropic";
}

function CHAT_BASE_PATH() {
  return "/api/coding/paas/v4";
}

function RESPONSES_BASE_PATH() {
  return "/api/v1";
}

function HEALTH_PATH() {
  return "/api/monitor/usage/quota/limit";
}

function CATALOG_PATH() {
  return "/api/anthropic/v1/models";
}

function MAX_CATALOG_BODY() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "ANTHROPIC_BASE_PATH": string; "CHAT_BASE_PATH": string; "RESPONSES_BASE_PATH": string; "HEALTH_PATH": string; "CATALOG_PATH": string; "MAX_CATALOG_BODY": bigint } = { "ANTHROPIC_BASE_PATH": ANTHROPIC_BASE_PATH(), "CHAT_BASE_PATH": CHAT_BASE_PATH(), "RESPONSES_BASE_PATH": RESPONSES_BASE_PATH(), "HEALTH_PATH": HEALTH_PATH(), "CATALOG_PATH": CATALOG_PATH(), "MAX_CATALOG_BODY": MAX_CATALOG_BODY() };
export const provenance = {"sourcePath":"src/zai_coding_plan.rs","sourceSha256":"47c521e6806fa8d543d939fd6b1751fb48b180874322cf0699957c9c85b79aa2","executable":6,"executableFunctions":0,"executableConstants":6,"carried":42,"preserved":49,"runtimeParity":false};
