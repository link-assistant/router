// Generated draft from src/token_error.rs; sha256=7461c7d04125715cbf5355778a10ba275d0af3742c61f12b99d37368af090353
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_fd3a114ce4304a88516467586605b189cc6f6a6d0b0a2e558b2f5a6532584b93 = {"schemaVersion":1,"types":{"RouterOption_28_named_4578706972794661637473":{"kind":"data","name":"RouterOption_28_named_4578706972794661637473","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"ExpiryFacts"}}]}]},"ExpiryFacts":{"kind":"data","name":"ExpiryFacts","ctors":[{"name":"ExpiryFacts","fields":[{"name":"issued_at","type":{"kind":"fixed","bits":64,"signed":true}},{"name":"expires_at","type":{"kind":"fixed","bits":64,"signed":true}},{"name":"ago_seconds","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_constructor_value_schema_1fa858e5fb16b88a24d645e6c654b6e53f8214343cf17d94d36c19472ab6ea24 = {"schemaVersion":1,"types":{"TokenError":{"kind":"data","name":"TokenError","ctors":[{"name":"InvalidPrefix","fields":[]},{"name":"Expired","fields":[{"name":"field0","type":{"kind":"data","name":"RouterOption_28_named_4578706972794661637473"}}]},{"name":"Revoked","fields":[]},{"name":"NotFound","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Invalid","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"SignatureInvalid","fields":[]},{"name":"IssuerSecretUnset","fields":[]},{"name":"MissingRecord","fields":[]},{"name":"BindingMismatch","fields":[]},{"name":"InsufficientScope","fields":[]},{"name":"LimitExceeded","fields":[{"name":"field0","type":{"kind":"data","name":"RouterOption_28_named_4275646765744661637473"}}]},{"name":"TokenLimitExceeded","fields":[{"name":"field0","type":{"kind":"data","name":"RouterOption_28_named_4275646765744661637473"}}]},{"name":"RateLimitExceeded","fields":[]},{"name":"Storage","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"RouterOption_28_named_4578706972794661637473":{"kind":"data","name":"RouterOption_28_named_4578706972794661637473","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"ExpiryFacts"}}]}]},"ExpiryFacts":{"kind":"data","name":"ExpiryFacts","ctors":[{"name":"ExpiryFacts","fields":[{"name":"issued_at","type":{"kind":"fixed","bits":64,"signed":true}},{"name":"expires_at","type":{"kind":"fixed","bits":64,"signed":true}},{"name":"ago_seconds","type":{"kind":"fixed","bits":64,"signed":true}}]}]},"RouterOption_28_named_4275646765744661637473":{"kind":"data","name":"RouterOption_28_named_4275646765744661637473","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"BudgetFacts"}}]}]},"BudgetFacts":{"kind":"data","name":"BudgetFacts","ctors":[{"name":"BudgetFacts","fields":[{"name":"used","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"limit","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_constructor_value_schema_5fe1caf3de9e85e6765107b0e434861f7387de2dc94e399ddc0e37ab404db6f7 = {"schemaVersion":1,"types":{"RouterOption_28_named_4275646765744661637473":{"kind":"data","name":"RouterOption_28_named_4275646765744661637473","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"BudgetFacts"}}]}]},"BudgetFacts":{"kind":"data","name":"BudgetFacts","ctors":[{"name":"BudgetFacts","fields":[{"name":"used","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"limit","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_schema_631d9e4ca5ac074b15d0ac803d36c2c14c7b0d8e4473a6ad25c6db0780c06347 = {"schemaVersion":1,"types":{"ExpiryFacts":{"kind":"data","name":"ExpiryFacts","ctors":[{"name":"ExpiryFacts","fields":[{"name":"issued_at","type":{"kind":"fixed","bits":64,"signed":true}},{"name":"expires_at","type":{"kind":"fixed","bits":64,"signed":true}},{"name":"ago_seconds","type":{"kind":"fixed","bits":64,"signed":true}}]}]},"RouterOption_28_named_4578706972794661637473":{"kind":"data","name":"RouterOption_28_named_4578706972794661637473","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"ExpiryFacts"}}]}]}}};

const ml_host_value_refinements_631d9e4ca5ac074b15d0ac803d36c2c14c7b0d8e4473a6ad25c6db0780c06347 = new Map([]);

const ml_host_value_schema_a384a55d03e11c49171095b337a899b311e9a87a8fd4882b7dacf93892e0d841 = {"schemaVersion":1,"types":{"BudgetFacts":{"kind":"data","name":"BudgetFacts","ctors":[{"name":"BudgetFacts","fields":[{"name":"used","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"limit","type":{"kind":"fixed","bits":64,"signed":false}}]}]},"RouterOption_28_named_4275646765744661637473":{"kind":"data","name":"RouterOption_28_named_4275646765744661637473","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"BudgetFacts"}}]}]}}};

const ml_host_value_refinements_a384a55d03e11c49171095b337a899b311e9a87a8fd4882b7dacf93892e0d841 = new Map([]);

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_TokenError_InvalidPrefix() {
  return Object.freeze({ $: 'InvalidPrefix' });
}

function ml_make_TokenError_Expired(field0) {
  ml_assert_constructor_input(field0, {"kind":"data","name":"RouterOption_28_named_4578706972794661637473"}, ml_constructor_value_schema_fd3a114ce4304a88516467586605b189cc6f6a6d0b0a2e558b2f5a6532584b93);
  ml_validate_rust_value(field0, {"kind":"data","name":"RouterOption_28_named_4578706972794661637473"}, ml_host_value_schema_631d9e4ca5ac074b15d0ac803d36c2c14c7b0d8e4473a6ad25c6db0780c06347, { refinements: ml_host_value_refinements_631d9e4ca5ac074b15d0ac803d36c2c14c7b0d8e4473a6ad25c6db0780c06347 });
  return ml_snapshot_constructor_value(Object.freeze({ $: 'Expired', field0: field0 }), {"kind":"data","name":"TokenError"}, ml_constructor_value_schema_1fa858e5fb16b88a24d645e6c654b6e53f8214343cf17d94d36c19472ab6ea24);
}

function ml_make_TokenError_Revoked() {
  return Object.freeze({ $: 'Revoked' });
}

function ml_make_TokenError_NotFound(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'NotFound', field0: field0 });
}

function ml_make_TokenError_Invalid(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Invalid', field0: field0 });
}

function ml_make_TokenError_SignatureInvalid() {
  return Object.freeze({ $: 'SignatureInvalid' });
}

function ml_make_TokenError_IssuerSecretUnset() {
  return Object.freeze({ $: 'IssuerSecretUnset' });
}

function ml_make_TokenError_MissingRecord() {
  return Object.freeze({ $: 'MissingRecord' });
}

function ml_make_TokenError_BindingMismatch() {
  return Object.freeze({ $: 'BindingMismatch' });
}

function ml_make_TokenError_InsufficientScope() {
  return Object.freeze({ $: 'InsufficientScope' });
}

function ml_make_TokenError_LimitExceeded(field0) {
  ml_assert_constructor_input(field0, {"kind":"data","name":"RouterOption_28_named_4275646765744661637473"}, ml_constructor_value_schema_5fe1caf3de9e85e6765107b0e434861f7387de2dc94e399ddc0e37ab404db6f7);
  ml_validate_rust_value(field0, {"kind":"data","name":"RouterOption_28_named_4275646765744661637473"}, ml_host_value_schema_a384a55d03e11c49171095b337a899b311e9a87a8fd4882b7dacf93892e0d841, { refinements: ml_host_value_refinements_a384a55d03e11c49171095b337a899b311e9a87a8fd4882b7dacf93892e0d841 });
  return ml_snapshot_constructor_value(Object.freeze({ $: 'LimitExceeded', field0: field0 }), {"kind":"data","name":"TokenError"}, ml_constructor_value_schema_1fa858e5fb16b88a24d645e6c654b6e53f8214343cf17d94d36c19472ab6ea24);
}

function ml_make_TokenError_TokenLimitExceeded(field0) {
  ml_assert_constructor_input(field0, {"kind":"data","name":"RouterOption_28_named_4275646765744661637473"}, ml_constructor_value_schema_5fe1caf3de9e85e6765107b0e434861f7387de2dc94e399ddc0e37ab404db6f7);
  ml_validate_rust_value(field0, {"kind":"data","name":"RouterOption_28_named_4275646765744661637473"}, ml_host_value_schema_a384a55d03e11c49171095b337a899b311e9a87a8fd4882b7dacf93892e0d841, { refinements: ml_host_value_refinements_a384a55d03e11c49171095b337a899b311e9a87a8fd4882b7dacf93892e0d841 });
  return ml_snapshot_constructor_value(Object.freeze({ $: 'TokenLimitExceeded', field0: field0 }), {"kind":"data","name":"TokenError"}, ml_constructor_value_schema_1fa858e5fb16b88a24d645e6c654b6e53f8214343cf17d94d36c19472ab6ea24);
}

function ml_make_TokenError_RateLimitExceeded() {
  return Object.freeze({ $: 'RateLimitExceeded' });
}

function ml_make_TokenError_Storage(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Storage', field0: field0 });
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

function ml_make_ExpiryFacts_ExpiryFacts(issued_at, expires_at, ago_seconds) {
  if (typeof issued_at !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(issued_at, -9223372036854775808n, 9223372036854775807n, "i64 argument issued_at out of range");
  if (!(typeof issued_at === 'bigint' && issued_at >= -9223372036854775808n && issued_at <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof expires_at !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(expires_at, -9223372036854775808n, 9223372036854775807n, "i64 argument expires_at out of range");
  if (!(typeof expires_at === 'bigint' && expires_at >= -9223372036854775808n && expires_at <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof ago_seconds !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(ago_seconds, -9223372036854775808n, 9223372036854775807n, "i64 argument ago_seconds out of range");
  if (!(typeof ago_seconds === 'bigint' && ago_seconds >= -9223372036854775808n && ago_seconds <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ExpiryFacts", ["issued_at"]: issued_at, ["expires_at"]: expires_at, ["ago_seconds"]: ago_seconds });
}

function ml_make_BudgetFacts_BudgetFacts(used, limit) {
  if (typeof used !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(used, 0n, 18446744073709551615n, "u64 argument used out of range");
  if (!(typeof used === 'bigint' && used >= 0n && used <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof limit !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(limit, 0n, 18446744073709551615n, "u64 argument limit out of range");
  if (!(typeof limit === 'bigint' && limit >= 0n && limit <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "BudgetFacts", ["used"]: used, ["limit"]: limit });
}

export const translated = { ["TokenError"]: Object.freeze({ ["InvalidPrefix"]: ml_make_TokenError_InvalidPrefix, ["Expired"]: ml_make_TokenError_Expired, ["Revoked"]: ml_make_TokenError_Revoked, ["NotFound"]: ml_make_TokenError_NotFound, ["Invalid"]: ml_make_TokenError_Invalid, ["SignatureInvalid"]: ml_make_TokenError_SignatureInvalid, ["IssuerSecretUnset"]: ml_make_TokenError_IssuerSecretUnset, ["MissingRecord"]: ml_make_TokenError_MissingRecord, ["BindingMismatch"]: ml_make_TokenError_BindingMismatch, ["InsufficientScope"]: ml_make_TokenError_InsufficientScope, ["LimitExceeded"]: ml_make_TokenError_LimitExceeded, ["TokenLimitExceeded"]: ml_make_TokenError_TokenLimitExceeded, ["RateLimitExceeded"]: ml_make_TokenError_RateLimitExceeded, ["Storage"]: ml_make_TokenError_Storage }), ["ExpiryFacts"]: ml_make_ExpiryFacts_ExpiryFacts, ["BudgetFacts"]: ml_make_BudgetFacts_BudgetFacts };
export const provenance = {"sourcePath":"src/token_error.rs","sourceSha256":"7461c7d04125715cbf5355778a10ba275d0af3742c61f12b99d37368af090353","executable":3,"executableFunctions":0,"executableConstants":0,"executableTypes":3,"executableConstructors":16,"carried":6,"preserved":9,"runtimeParity":false};
