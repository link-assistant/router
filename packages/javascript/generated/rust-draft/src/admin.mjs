// Generated draft from src/admin.rs; sha256=6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_61646d696e2e41444d494e5f544f4b454e5f505245464958() {
  return "la_admin_";
}

function rp_61646d696e2e434c41494d5f46494c455f4e414d45() {
  return "admin-claim.json";
}

function rp_61646d696e2e44454641554c545f43414e4449444154455f54544c5f53454353() {
  return 120n;
}

function rp_61646d696e2e44454641554c545f434c41494d5f54544c5f484f555253() {
  return ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function rp_61646d696e2e434c41494d5f544f4b454e5f4c4142454c() {
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

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function ml_make_Candidate_Candidate(claim_id, token, expires_in_secs, ttl_hours) {
  if (!(typeof claim_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(claim_id))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  if (typeof expires_in_secs !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(expires_in_secs, 0n, 18446744073709551615n, "u64 argument expires_in_secs out of range");
  if (!(typeof expires_in_secs === 'bigint' && expires_in_secs >= 0n && expires_in_secs <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof ttl_hours !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(ttl_hours, -9223372036854775808n, 9223372036854775807n, "i64 argument ttl_hours out of range");
  if (!(typeof ttl_hours === 'bigint' && ttl_hours >= -9223372036854775808n && ttl_hours <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Candidate", ["claim_id"]: claim_id, ["token"]: token, ["expires_in_secs"]: expires_in_secs, ["ttl_hours"]: ttl_hours });
}

export const translated = { ["ADMIN_TOKEN_PREFIX"]: rp_61646d696e2e41444d494e5f544f4b454e5f505245464958(), ["CLAIM_FILE_NAME"]: rp_61646d696e2e434c41494d5f46494c455f4e414d45(), ["DEFAULT_CANDIDATE_TTL_SECS"]: rp_61646d696e2e44454641554c545f43414e4449444154455f54544c5f53454353(), ["DEFAULT_CLAIM_TTL_HOURS"]: rp_61646d696e2e44454641554c545f434c41494d5f54544c5f484f555253(), ["CLAIM_TOKEN_LABEL"]: rp_61646d696e2e434c41494d5f544f4b454e5f4c4142454c(), ["ClaimError"]: Object.freeze({ ["AlreadyClaimed"]: ml_make_ClaimError_AlreadyClaimed, ["ProvisionedByEnvironment"]: ml_make_ClaimError_ProvisionedByEnvironment, ["NoCandidate"]: ml_make_ClaimError_NoCandidate, ["ClaimIdMismatch"]: ml_make_ClaimError_ClaimIdMismatch, ["TokenMismatch"]: ml_make_ClaimError_TokenMismatch, ["Storage"]: ml_make_ClaimError_Storage }), ["Candidate"]: ml_make_Candidate_Candidate };
export const provenance = {"sourcePath":"src/admin.rs","sourceSha256":"6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e","executable":7,"executableFunctions":0,"executableConstants":5,"executableTypes":2,"executableConstructors":7,"carried":31,"preserved":39,"runtimeParity":false};
