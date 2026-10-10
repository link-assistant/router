// Generated draft from src/admin.rs; sha256=6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ADMIN_TOKEN_PREFIX() {
  return "la_admin_";
}

function CLAIM_FILE_NAME() {
  return "admin-claim.json";
}

function DEFAULT_CANDIDATE_TTL_SECS() {
  return 120n;
}

function DEFAULT_CLAIM_TTL_HOURS() {
  return ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function CLAIM_TOKEN_LABEL() {
  return "first-visitor-admin";
}

export const translated: { "ADMIN_TOKEN_PREFIX": string; "CLAIM_FILE_NAME": string; "DEFAULT_CANDIDATE_TTL_SECS": bigint; "DEFAULT_CLAIM_TTL_HOURS": bigint; "CLAIM_TOKEN_LABEL": string } = { "ADMIN_TOKEN_PREFIX": ADMIN_TOKEN_PREFIX(), "CLAIM_FILE_NAME": CLAIM_FILE_NAME(), "DEFAULT_CANDIDATE_TTL_SECS": DEFAULT_CANDIDATE_TTL_SECS(), "DEFAULT_CLAIM_TTL_HOURS": DEFAULT_CLAIM_TTL_HOURS(), "CLAIM_TOKEN_LABEL": CLAIM_TOKEN_LABEL() };
export const provenance = {"sourcePath":"src/admin.rs","sourceSha256":"6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e","executable":5,"carried":33,"preserved":39,"runtimeParity":false};
