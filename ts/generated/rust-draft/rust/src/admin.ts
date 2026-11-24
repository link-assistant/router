type MLData_43616e646964617465 = Readonly<{ readonly "$": "Candidate"; readonly "claim_id": string; readonly "token": string; readonly "expires_in_secs": bigint; readonly "ttl_hours": bigint }>;
type MLData_436c61696d4572726f72 = Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>;
type MLData_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e56616c7565 }>;
type MLData_526f757465724f7074696f6e5f33385f6e616d65645f3733373436345f37343639366436355f34343735373236313734363936663665 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_7374642e74696d652e4475726174696f6e }>;
type MLData_526f757465724f7074696f6e5f33395f6e616d65645f37333635373236343635356636613733366636655f346537353664363236353732 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e4e756d626572 }>;
type MLData_526f757465724f7074696f6e5f335f693332 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f335f693634 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f335f753634 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f345f626f6f6c = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": boolean }>;
type MLData_526f757465724f7074696f6e5f345f756e6974 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": null }>;
type MLData_526f757465724f7074696f6e5f35325f727573745f6f776e65645f7665635f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<MLData_73657264655f6a736f6e2e56616c7565> }>;
type MLData_526f757465724f7074696f6e5f35345f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e56616c7565 }>;
type MLData_526f757465724f7074696f6e5f35365f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f346537353664363236353732 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e4e756d626572 }>;
type MLData_526f757465724f7074696f6e5f35395f6e616d65645f37333635373236343635356636613733366636655f3464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 }>;
type MLData_526f757465724f7074696f6e5f355f666c6f6174 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": number }>;
type MLData_526f757465724f7074696f6e5f36395f7265666572656e63655f7368617265645f727573745f6f776e65645f7665635f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<MLData_73657264655f6a736f6e2e56616c7565> }>;
type MLData_526f757465724f7074696f6e5f365f737472696e67 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_526f757465724f7074696f6e5f37365f7265666572656e63655f7368617265645f6e616d65645f37333635373236343635356636613733366636655f3464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 }>;
type MLData_526f75746572526573756c745f31375f727573745f6f776e65645f737472696e675f32385f6e616d65645f3733373436345f363936665f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e696f2e4572726f72 }>;
type MLData_526f75746572526573756c745f31375f727573745f6f776e65645f737472696e675f33365f6e616d65645f3733373436345f3635366537365f35363631373234353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e656e762e5661724572726f72 }>;
type MLData_526f75746572526573756c745f31375f727573745f6f776e65645f737472696e675f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_526f75746572526573756c745f31375f727573745f6f776e65645f7665635f75385f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": ReadonlyArray<bigint> }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_526f75746572526573756c745f33375f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": MLData_73657264655f6a736f6e2e56616c7565 }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_526f75746572526573756c745f33385f6e616d65645f3733373436345f37343639366436355f343437353732363137343639366636655f36345f6e616d65645f3733373436345f37343639366436355f353437323739343637323666366434363663366636313734353336353633373334353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": MLData_7374642e74696d652e4475726174696f6e }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f72 }>;
type MLData_526f75746572526573756c745f345f756e69745f32385f6e616d65645f3733373436345f363936665f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e696f2e4572726f72 }>;
type MLData_726f757465725f636f72655f6261736536342e4261736536344572726f72 = Readonly<{ readonly "$": "InvalidByte"; readonly "field0": bigint; readonly "field1": bigint }> | Readonly<{ readonly "$": "InvalidLength"; readonly "field0": bigint }> | Readonly<{ readonly "$": "InvalidLastSymbol"; readonly "offset": bigint; readonly "symbol": bigint; readonly "symbol_value": bigint }> | Readonly<{ readonly "$": "InvalidPadding" }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633333566363933363334 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_73657264655f6a736f6e2e4572726f72 = Readonly<{ readonly "$": "JsonError"; readonly "category": MLData_73657264655f6a736f6e2e6572726f722e43617465676f7279; readonly "line": bigint; readonly "column": bigint; readonly "message": string }>;
type MLData_73657264655f6a736f6e2e4d6170456e747279 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_73657264655f6a736f6e2e56616c7565 }>;
type MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_73657264655f6a736f6e2e4d6170456e747279> }>;
type MLData_73657264655f6a736f6e2e4e756d626572 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_73657264655f6a736f6e2e56616c7565 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_73657264655f6a736f6e2e4e756d626572 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_73657264655f6a736f6e2e56616c7565> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 }>;
type MLData_73657264655f6a736f6e2e6572726f722e43617465676f7279 = Readonly<{ readonly "$": "Io" }> | Readonly<{ readonly "$": "Syntax" }> | Readonly<{ readonly "$": "Data" }> | Readonly<{ readonly "$": "Eof" }>;
type MLData_7374642e656e762e5661724572726f72 = Readonly<{ readonly "$": "NotPresent" }> | Readonly<{ readonly "$": "NotUnicode"; readonly "field0": MLData_7374642e6666692e4f73537472696e67 }>;
type MLData_7374642e6666692e4f73537472696e67 = Readonly<{ readonly "$": "OsString"; readonly "bytes": ReadonlyArray<bigint> }>;
type MLData_7374642e696f2e4572726f72 = Readonly<{ readonly "$": "IoError"; readonly "kind": string; readonly "message": string; readonly "raw_os_error": MLData_526f757465724f7074696f6e5f335f693332 }>;
type MLData_7374642e6e756d2e496e744572726f724b696e64 = Readonly<{ readonly "$": "Empty" }> | Readonly<{ readonly "$": "InvalidDigit" }> | Readonly<{ readonly "$": "PosOverflow" }> | Readonly<{ readonly "$": "NegOverflow" }> | Readonly<{ readonly "$": "Zero" }>;
type MLData_7374642e6e756d2e5061727365496e744572726f72 = Readonly<{ readonly "$": "ParseIntError"; readonly "kind": MLData_7374642e6e756d2e496e744572726f724b696e64 }>;
type MLData_7374642e74696d652e4475726174696f6e = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
type MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f72 = Readonly<{ readonly "$": "TryFromFloatSecsError"; readonly "kind": MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f724b696e64 }>;
type MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f724b696e64 = Readonly<{ readonly "$": "Negative" }> | Readonly<{ readonly "$": "OverflowOrNan" }>;
// Generated draft from rust/src/admin.rs; sha256=1f5b0823829dadf5f59208154917c2c8ad9ebddd09ce5b5527d233021829a489
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from "../../runtime/fixed-integer-runtime.mjs";

import { assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

const ml_host_value_schema_1a340518623ce749a9afa850fc2a5764a531ec3758ac3f7bbad5cb4d3da2a03e = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f335f693634":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f693634","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_1a340518623ce749a9afa850fc2a5764a531ec3758ac3f7bbad5cb4d3da2a03e = new Map([]);

function ml_host_bool_then_some<T>(value: boolean, argument: T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then<T>(value: boolean, callback: () => T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok<T>(value: Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, callback: (value: T) => U): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}> { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, defaultValue: U, callback: (value: T) => U): U { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

const ml_host_rust_fixed_min_i64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":true}).rust_fixed_min;

function rp_61646d696e2e41444d494e5f544f4b454e5f505245464958(): string {
  return "la_admin_";
}

function rp_61646d696e2e434c41494d5f46494c455f4e414d45(): string {
  return "admin-claim.json";
}

function rp_61646d696e2e44454641554c545f43414e4449444154455f54544c5f53454353(): bigint {
  return 120n;
}

function rp_61646d696e2e44454641554c545f434c41494d5f54544c5f484f555253(): bigint {
  return ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function rp_61646d696e2e434c41494d5f544f4b454e5f4c4142454c(): string {
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

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

function ml_make_Candidate_Candidate(claim_id: string, token: string, expires_in_secs: bigint, ttl_hours: bigint): Readonly<{ readonly "$": "Candidate"; readonly "claim_id": string; readonly "token": string; readonly "expires_in_secs": bigint; readonly "ttl_hours": bigint }> {
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

function rp_61646d696e2e636c616d705f74746c(ttl_hours: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>): bigint {
  ml_pattern_immutable(ttl_hours);
  ml_validate_rust_value(ttl_hours, {"kind":"data","name":"rp_526f757465724f7074696f6e5f335f693634"}, ml_host_value_schema_1a340518623ce749a9afa850fc2a5764a531ec3758ac3f7bbad5cb4d3da2a03e, { refinements: ml_host_value_refinements_1a340518623ce749a9afa850fc2a5764a531ec3758ac3f7bbad5cb4d3da2a03e });
  return ml_host_option_map_or((() => {
    const ml_standard_callback_self_1 = ttl_hours as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
    return (() => {
    const ml_pattern_3 = ml_standard_callback_self_1 as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
    if ((ml_pattern_immutable(ml_pattern_3) && (ml_pattern_3.$ === "Some"))) {
      const ml_standard_pattern_2 = (ml_pattern_3)["field0"];
      if ((() => {
      const ml_standard_callback_arg_4 = ml_standard_pattern_2;
      const hours = ml_standard_callback_arg_4;
      return (hours > 0n);
    })()) {
        return Object.freeze({ $: 'Some', field0: ml_standard_pattern_2 });
      } else {
      }
    } else {
    }
    return Object.freeze({ $: 'None' });
    })();
  })(), rp_61646d696e2e44454641554c545f434c41494d5f54544c5f484f555253(), (hours_2) => { return ml_host_rust_fixed_min_i64(hours_2, rp_61646d696e2e44454641554c545f434c41494d5f54544c5f484f555253()); });
}

export const translated: { "ADMIN_TOKEN_PREFIX": string; "CLAIM_FILE_NAME": string; "DEFAULT_CANDIDATE_TTL_SECS": bigint; "DEFAULT_CLAIM_TTL_HOURS": bigint; "CLAIM_TOKEN_LABEL": string; "ClaimError": Readonly<{ "AlreadyClaimed": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "ProvisionedByEnvironment": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "NoCandidate": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "ClaimIdMismatch": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "TokenMismatch": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }>; "Storage": () => Readonly<{ readonly "$": "AlreadyClaimed" }> | Readonly<{ readonly "$": "ProvisionedByEnvironment" }> | Readonly<{ readonly "$": "NoCandidate" }> | Readonly<{ readonly "$": "ClaimIdMismatch" }> | Readonly<{ readonly "$": "TokenMismatch" }> | Readonly<{ readonly "$": "Storage" }> }>; "Candidate": (claim_id: string, token: string, expires_in_secs: bigint, ttl_hours: bigint) => Readonly<{ readonly "$": "Candidate"; readonly "claim_id": string; readonly "token": string; readonly "expires_in_secs": bigint; readonly "ttl_hours": bigint }>; "clamp_ttl": (ttl_hours: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>) => bigint } = { ["ADMIN_TOKEN_PREFIX"]: rp_61646d696e2e41444d494e5f544f4b454e5f505245464958(), ["CLAIM_FILE_NAME"]: rp_61646d696e2e434c41494d5f46494c455f4e414d45(), ["DEFAULT_CANDIDATE_TTL_SECS"]: rp_61646d696e2e44454641554c545f43414e4449444154455f54544c5f53454353(), ["DEFAULT_CLAIM_TTL_HOURS"]: rp_61646d696e2e44454641554c545f434c41494d5f54544c5f484f555253(), ["CLAIM_TOKEN_LABEL"]: rp_61646d696e2e434c41494d5f544f4b454e5f4c4142454c(), ["ClaimError"]: Object.freeze({ ["AlreadyClaimed"]: ml_make_ClaimError_AlreadyClaimed, ["ProvisionedByEnvironment"]: ml_make_ClaimError_ProvisionedByEnvironment, ["NoCandidate"]: ml_make_ClaimError_NoCandidate, ["ClaimIdMismatch"]: ml_make_ClaimError_ClaimIdMismatch, ["TokenMismatch"]: ml_make_ClaimError_TokenMismatch, ["Storage"]: ml_make_ClaimError_Storage }), ["Candidate"]: ml_make_Candidate_Candidate, ["clamp_ttl"]: rp_61646d696e2e636c616d705f74746c };
export const provenance = {"sourcePath":"rust/src/admin.rs","sourceSha256":"1f5b0823829dadf5f59208154917c2c8ad9ebddd09ce5b5527d233021829a489","executable":8,"executableFunctions":1,"executableConstants":5,"executableTypes":2,"executableConstructors":7,"carried":30,"preserved":39,"runtimeParity":false};
