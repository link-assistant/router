// Generated draft from src/admin.rs; sha256=6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ADMIN_TOKEN_PREFIX() {
  return "la_admin_";
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

function ml_make_ClaimError_AlreadyClaimed() {
  return Object.freeze({ $: 'AlreadyClaimed' });
}

function ml_make_ClaimError_ProvisionedByEnvironment() {
  return Object.freeze({ $: 'ProvisionedByEnvironment' });
}

function ml_make_ClaimError_NoCandidate() {
  return Object.freeze({ $: 'NoCandidate' });
}

function ml_make_ClaimError_ClaimIdMismatch() {
  return Object.freeze({ $: 'ClaimIdMismatch' });
}

function ml_make_ClaimError_TokenMismatch() {
  return Object.freeze({ $: 'TokenMismatch' });
}

function ml_make_ClaimError_Storage() {
  return Object.freeze({ $: 'Storage' });
}

function ml_make_Candidate_Candidate(claim_id, token, expires_in_secs, ttl_hours) {
  if (!(typeof claim_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(claim_id))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(expires_in_secs, 0n, 18446744073709551615n, "u64 argument expires_in_secs out of range");
  if (!(typeof expires_in_secs === 'bigint' && expires_in_secs >= 0n && expires_in_secs <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(ttl_hours, -9223372036854775808n, 9223372036854775807n, "i64 argument ttl_hours out of range");
  if (!(typeof ttl_hours === 'bigint' && ttl_hours >= -9223372036854775808n && ttl_hours <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Candidate", ["claim_id"]: claim_id, ["token"]: token, ["expires_in_secs"]: expires_in_secs, ["ttl_hours"]: ttl_hours });
}

export const translated = { ["ADMIN_TOKEN_PREFIX"]: ADMIN_TOKEN_PREFIX(), ["CLAIM_FILE_NAME"]: CLAIM_FILE_NAME(), ["DEFAULT_CANDIDATE_TTL_SECS"]: DEFAULT_CANDIDATE_TTL_SECS(), ["DEFAULT_CLAIM_TTL_HOURS"]: DEFAULT_CLAIM_TTL_HOURS(), ["CLAIM_TOKEN_LABEL"]: CLAIM_TOKEN_LABEL(), ["ClaimError"]: Object.freeze({ ["AlreadyClaimed"]: ml_make_ClaimError_AlreadyClaimed, ["ProvisionedByEnvironment"]: ml_make_ClaimError_ProvisionedByEnvironment, ["NoCandidate"]: ml_make_ClaimError_NoCandidate, ["ClaimIdMismatch"]: ml_make_ClaimError_ClaimIdMismatch, ["TokenMismatch"]: ml_make_ClaimError_TokenMismatch, ["Storage"]: ml_make_ClaimError_Storage }), ["Candidate"]: ml_make_Candidate_Candidate };
export const provenance = {"sourcePath":"src/admin.rs","sourceSha256":"6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e","executable":7,"executableFunctions":0,"executableConstants":5,"executableTypes":2,"executableConstructors":7,"carried":31,"preserved":39,"runtimeParity":false};
