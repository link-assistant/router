// Generated draft from src/emergency_auth.rs; sha256=ebab1272b62f4aea43950d1b6f30189aec995e52330965df8f4dc00e0a5efe94
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function FLAG() {
  return "--emergency-accept-any-token";
}

function ENV() {
  return "EMERGENCY_ACCEPT_ANY_TOKEN";
}

function ALLOW_NON_LOOPBACK_ENV() {
  return "EMERGENCY_ALLOW_NON_LOOPBACK";
}

function DURATION_ENV() {
  return "EMERGENCY_DURATION_MINUTES";
}

function DEFAULT_DURATION_MINUTES() {
  return 60n;
}

function MAX_DURATION_MINUTES() {
  return ml_fixed((24n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function SUBJECT_PREFIX() {
  return "emergency-bypass-";
}

function LABEL() {
  return "emergency-bypass";
}

function HEALTH_HEADER() {
  return "x-link-assistant-emergency-auth";
}

function is_synthetic_id(token_id: string) {
  if (!(typeof token_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token_id))) throw new TypeError('argument outside supported Rust value domain');
  return token_id.startsWith(SUBJECT_PREFIX());
}

export const translated: { "FLAG": string; "ENV": string; "ALLOW_NON_LOOPBACK_ENV": string; "DURATION_ENV": string; "DEFAULT_DURATION_MINUTES": bigint; "MAX_DURATION_MINUTES": bigint; "SUBJECT_PREFIX": string; "LABEL": string; "HEALTH_HEADER": string; "is_synthetic_id": (token_id: string) => boolean } = { "FLAG": FLAG(), "ENV": ENV(), "ALLOW_NON_LOOPBACK_ENV": ALLOW_NON_LOOPBACK_ENV(), "DURATION_ENV": DURATION_ENV(), "DEFAULT_DURATION_MINUTES": DEFAULT_DURATION_MINUTES(), "MAX_DURATION_MINUTES": MAX_DURATION_MINUTES(), "SUBJECT_PREFIX": SUBJECT_PREFIX(), "LABEL": LABEL(), "HEALTH_HEADER": HEALTH_HEADER(), is_synthetic_id };
export const provenance = {"sourcePath":"src/emergency_auth.rs","sourceSha256":"ebab1272b62f4aea43950d1b6f30189aec995e52330965df8f4dc00e0a5efe94","executable":10,"executableFunctions":1,"executableConstants":9,"carried":21,"preserved":32,"runtimeParity":false};
