// Generated draft from src/zai_coding_plan_exhaustion_tests.rs; sha256=011163fc8e2739b68cb6acf75ebd48d6c9bd3d2f545ea636ef3f5c87145bbb92
// Carried constructs are data, never runtime parity evidence.
function EXHAUSTED() {
  return "{\"error\":{\"code\":\"1113\",\"message\":\"[1113][Insufficient balance or no resource package. Please recharge.][req-657]\",\"type\":\"rate_limit_error\"},\"type\":\"error\"}";
}

function RATE_LIMITED() {
  return "{\"error\":{\"code\":\"1302\",\"message\":\"[1302][High concurrency usage of this API, please reduce concurrency or contact customer service to increase limits][req-1302]\",\"type\":\"rate_limit_error\"},\"type\":\"error\"}";
}

export const translated = { "EXHAUSTED": EXHAUSTED(), "RATE_LIMITED": RATE_LIMITED() };
export const provenance = {"sourcePath":"src/zai_coding_plan_exhaustion_tests.rs","sourceSha256":"011163fc8e2739b68cb6acf75ebd48d6c9bd3d2f545ea636ef3f5c87145bbb92","executable":2,"executableFunctions":0,"executableConstants":2,"carried":10,"preserved":13,"runtimeParity":false};
