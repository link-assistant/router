type MLData_43616e646964617465 = Readonly<{ readonly "$": "Candidate"; readonly "claim_id": string; readonly "token": string; readonly "expires_in_secs": bigint; readonly "ttl_hours": bigint }>;
type MLData_436c61696d4572726f72 = Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>;
type MLData_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e56616c7565 }>;
type MLData_526f757465724f7074696f6e5f33385f6e616d65645f3733373436345f37343639366436355f34343735373236313734363936663665 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_7374642e74696d652e4475726174696f6e }>;
type MLData_526f757465724f7074696f6e5f33395f6e616d65645f37333635373236343635356636613733366636655f346537353664363236353732 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e4e756d626572 }>;
type MLData_526f757465724f7074696f6e5f335f693332 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f335f693634 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f335f753634 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f34335f61727261795f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<MLData_73657264655f6a736f6e2e56616c7565> }>;
type MLData_526f757465724f7074696f6e5f345f626f6f6c = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": boolean }>;
type MLData_526f757465724f7074696f6e5f345f756e6974 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": null }>;
type MLData_526f757465724f7074696f6e5f35395f6e616d65645f37333635373236343635356636613733366636655f3464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 }>;
type MLData_526f757465724f7074696f6e5f355f666c6f6174 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": number }>;
type MLData_526f757465724f7074696f6e5f365f737472696e67 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_526f75746572526573756c745f33375f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": MLData_73657264655f6a736f6e2e56616c7565 }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_526f75746572526573756c745f33385f6e616d65645f3733373436345f37343639366436355f343437353732363137343639366636655f36345f6e616d65645f3733373436345f37343639366436355f353437323739343637323666366434363663366636313734353336353633373334353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": MLData_7374642e74696d652e4475726174696f6e }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f72 }>;
type MLData_526f75746572526573756c745f345f756e69745f32385f6e616d65645f3733373436345f363936665f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e696f2e4572726f72 }>;
type MLData_526f75746572526573756c745f365f737472696e675f32385f6e616d65645f3733373436345f363936665f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e696f2e4572726f72 }>;
type MLData_526f75746572526573756c745f365f737472696e675f33365f6e616d65645f3733373436345f3635366537365f35363631373234353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e656e762e5661724572726f72 }>;
type MLData_526f75746572526573756c745f365f737472696e675f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_526f75746572526573756c745f385f61727261795f75385f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": ReadonlyArray<bigint> }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_73657264655f6a736f6e2e4572726f72 = Readonly<{ readonly "$": "JsonError"; readonly "category": MLData_73657264655f6a736f6e2e6572726f722e43617465676f7279; readonly "line": bigint; readonly "column": bigint; readonly "message": string }>;
type MLData_73657264655f6a736f6e2e4d6170456e747279 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_73657264655f6a736f6e2e56616c7565 }>;
type MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_73657264655f6a736f6e2e4d6170456e747279> }>;
type MLData_73657264655f6a736f6e2e4e756d626572 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_73657264655f6a736f6e2e56616c7565 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_73657264655f6a736f6e2e4e756d626572 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_73657264655f6a736f6e2e56616c7565> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 }>;
type MLData_73657264655f6a736f6e2e6572726f722e43617465676f7279 = Readonly<{ readonly "$": "Io" }> | Readonly<{ readonly "$": "Syntax" }> | Readonly<{ readonly "$": "Data" }> | Readonly<{ readonly "$": "Eof" }>;
type MLData_7374642e656e762e5661724572726f72 = Readonly<{ readonly "$": "NotPresent" }> | Readonly<{ readonly "$": "NotUnicode"; readonly "field0": MLData_7374642e6666692e4f73537472696e67 }>;
type MLData_7374642e6666692e4f73537472696e67 = Readonly<{ readonly "$": "OsString"; readonly "bytes": ReadonlyArray<bigint> }>;
type MLData_7374642e696f2e4572726f72 = Readonly<{ readonly "$": "IoError"; readonly "kind": string; readonly "message": string; readonly "raw_os_error": MLData_526f757465724f7074696f6e5f335f693332 }>;
type MLData_7374642e74696d652e4475726174696f6e = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
type MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f72 = Readonly<{ readonly "$": "TryFromFloatSecsError"; readonly "kind": MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f724b696e64 }>;
type MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f724b696e64 = Readonly<{ readonly "$": "Negative" }> | Readonly<{ readonly "$": "OverflowOrNan" }>;
// Generated draft from src/admin.rs; sha256=6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ADMIN_TOKEN_PREFIX(): string {
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

function CLAIM_FILE_NAME(): string {
  return "admin-claim.json";
}

function DEFAULT_CANDIDATE_TTL_SECS(): bigint {
  return 120n;
}

function DEFAULT_CLAIM_TTL_HOURS(): bigint {
  return ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function CLAIM_TOKEN_LABEL(): string {
  return "first-visitor-admin";
}

function ml_make_ClaimError_AlreadyClaimed(): Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }> {
  return Object.freeze({ $: 'AlreadyClaimed' });
}

function ml_make_ClaimError_ProvisionedByEnvironment(): Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }> {
  return Object.freeze({ $: 'ProvisionedByEnvironment' });
}

function ml_make_ClaimError_NoCandidate(): Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }> {
  return Object.freeze({ $: 'NoCandidate' });
}

function ml_make_ClaimError_ClaimIdMismatch(): Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }> {
  return Object.freeze({ $: 'ClaimIdMismatch' });
}

function ml_make_ClaimError_TokenMismatch(): Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }> {
  return Object.freeze({ $: 'TokenMismatch' });
}

function ml_make_ClaimError_Storage(): Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }> {
  return Object.freeze({ $: 'Storage' });
}

function ml_make_Candidate_Candidate(claim_id: string, token: string, expires_in_secs: bigint, ttl_hours: bigint): Readonly<{ readonly "$": "Candidate"; readonly "claim_id": string; readonly "token": string; readonly "expires_in_secs": bigint; readonly "ttl_hours": bigint }> {
  if (!(typeof claim_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(claim_id))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(expires_in_secs, 0n, 18446744073709551615n, "u64 argument expires_in_secs out of range");
  if (!(typeof expires_in_secs === 'bigint' && expires_in_secs >= 0n && expires_in_secs <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(ttl_hours, -9223372036854775808n, 9223372036854775807n, "i64 argument ttl_hours out of range");
  if (!(typeof ttl_hours === 'bigint' && ttl_hours >= -9223372036854775808n && ttl_hours <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Candidate", ["claim_id"]: claim_id, ["token"]: token, ["expires_in_secs"]: expires_in_secs, ["ttl_hours"]: ttl_hours });
}

export const translated: { "ADMIN_TOKEN_PREFIX": string; "CLAIM_FILE_NAME": string; "DEFAULT_CANDIDATE_TTL_SECS": bigint; "DEFAULT_CLAIM_TTL_HOURS": bigint; "CLAIM_TOKEN_LABEL": string; "ClaimError": Readonly<{ "AlreadyClaimed": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "ProvisionedByEnvironment": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "NoCandidate": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "ClaimIdMismatch": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "TokenMismatch": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "Storage": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }> }>; "Candidate": (claim_id: string, token: string, expires_in_secs: bigint, ttl_hours: bigint) => Readonly<{ readonly "$": "Candidate"; readonly "claim_id": string; readonly "token": string; readonly "expires_in_secs": bigint; readonly "ttl_hours": bigint }> } = { ["ADMIN_TOKEN_PREFIX"]: ADMIN_TOKEN_PREFIX(), ["CLAIM_FILE_NAME"]: CLAIM_FILE_NAME(), ["DEFAULT_CANDIDATE_TTL_SECS"]: DEFAULT_CANDIDATE_TTL_SECS(), ["DEFAULT_CLAIM_TTL_HOURS"]: DEFAULT_CLAIM_TTL_HOURS(), ["CLAIM_TOKEN_LABEL"]: CLAIM_TOKEN_LABEL(), ["ClaimError"]: Object.freeze({ ["AlreadyClaimed"]: ml_make_ClaimError_AlreadyClaimed, ["ProvisionedByEnvironment"]: ml_make_ClaimError_ProvisionedByEnvironment, ["NoCandidate"]: ml_make_ClaimError_NoCandidate, ["ClaimIdMismatch"]: ml_make_ClaimError_ClaimIdMismatch, ["TokenMismatch"]: ml_make_ClaimError_TokenMismatch, ["Storage"]: ml_make_ClaimError_Storage }), ["Candidate"]: ml_make_Candidate_Candidate };
export const provenance = {"sourcePath":"src/admin.rs","sourceSha256":"6ff7905bacd552ef1da7cde41c172e824668ef8913087a670a04bdabe377bf1e","executable":7,"executableFunctions":0,"executableConstants":5,"executableTypes":2,"executableConstructors":7,"carried":31,"preserved":39,"runtimeParity":false};
