// Generated draft from src/lefine.rs; sha256=bb07ea2db551cc85bc19403bfd2c160f439d6c48fe7ffc49a1e0cad249dc2093
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: any, min: any, max: any, message: any) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function BASE_URL() {
  return "https://lefine.pro/v1";
}

function MAX_CATALOG_BODY() {
  return ml_fixed((1024n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

export const translated: { "BASE_URL": string; "MAX_CATALOG_BODY": bigint } = { "BASE_URL": BASE_URL(), "MAX_CATALOG_BODY": MAX_CATALOG_BODY() };
export const provenance = {"sourcePath":"src/lefine.rs","sourceSha256":"bb07ea2db551cc85bc19403bfd2c160f439d6c48fe7ffc49a1e0cad249dc2093","executable":2,"carried":15,"preserved":18,"runtimeParity":false};
