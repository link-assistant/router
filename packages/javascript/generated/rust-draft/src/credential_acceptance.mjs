// Generated draft from src/credential_acceptance.rs; sha256=4a10a1e016936d2f4dd8fddc21ed400f8ed72794343b09d5bc2e779525231b10
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_a934a5ab703c4d567091a060518368d666ae850e3f14318ec744ecb824ae0ae2 = {"schemaVersion":1,"types":{"AcceptanceFailureKind":{"kind":"data","name":"AcceptanceFailureKind","ctors":[{"name":"NotAttempted","fields":[]},{"name":"ExchangeRejected","fields":[]},{"name":"ExchangeUncertain","fields":[]},{"name":"PersistenceUncertain","fields":[]},{"name":"SuccessorRetained","fields":[]}]}}};

const ml_host_value_refinements_a934a5ab703c4d567091a060518368d666ae850e3f14318ec744ecb824ae0ae2 = new Map([]);

const ml_host_value_schema_60f2d305c13ab15c98c8e68490bd3a07ea853e21742955f6c85bc68279fc0396 = {"schemaVersion":1,"types":{"AcceptancePhase":{"kind":"data","name":"AcceptancePhase","ctors":[{"name":"Preflight","fields":[]},{"name":"Exchange","fields":[]},{"name":"Persistence","fields":[]},{"name":"Catalog","fields":[]},{"name":"Promotion","fields":[]}]}}};

const ml_host_value_refinements_60f2d305c13ab15c98c8e68490bd3a07ea853e21742955f6c85bc68279fc0396 = new Map([]);

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

function rp_63726564656e7469616c5f616363657074616e63652e414343455054414e43455f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(20n);
}

function rp_63726564656e7469616c5f616363657074616e63652e53544147494e475f4449524543544f5259() {
  return "auth-import-candidates";
}

function ml_make_AcceptancePhase_Preflight() {
  return Object.freeze({ $: 'Preflight' });
}

function ml_make_AcceptancePhase_Exchange() {
  return Object.freeze({ $: 'Exchange' });
}

function ml_make_AcceptancePhase_Persistence() {
  return Object.freeze({ $: 'Persistence' });
}

function ml_make_AcceptancePhase_Catalog() {
  return Object.freeze({ $: 'Catalog' });
}

function ml_make_AcceptancePhase_Promotion() {
  return Object.freeze({ $: 'Promotion' });
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

function ml_make_AcceptanceFailureKind_NotAttempted() {
  return Object.freeze({ $: 'NotAttempted' });
}

function ml_make_AcceptanceFailureKind_ExchangeRejected() {
  return Object.freeze({ $: 'ExchangeRejected' });
}

function ml_make_AcceptanceFailureKind_ExchangeUncertain() {
  return Object.freeze({ $: 'ExchangeUncertain' });
}

function ml_make_AcceptanceFailureKind_PersistenceUncertain() {
  return Object.freeze({ $: 'PersistenceUncertain' });
}

function ml_make_AcceptanceFailureKind_SuccessorRetained() {
  return Object.freeze({ $: 'SuccessorRetained' });
}

function ml_make_AcceptanceFailure_AcceptanceFailure(kind, phase, transaction_id, message) {
  ml_validate_rust_value(kind, {"kind":"data","name":"AcceptanceFailureKind"}, ml_host_value_schema_a934a5ab703c4d567091a060518368d666ae850e3f14318ec744ecb824ae0ae2, { refinements: ml_host_value_refinements_a934a5ab703c4d567091a060518368d666ae850e3f14318ec744ecb824ae0ae2 });
  ml_validate_rust_value(phase, {"kind":"data","name":"AcceptancePhase"}, ml_host_value_schema_60f2d305c13ab15c98c8e68490bd3a07ea853e21742955f6c85bc68279fc0396, { refinements: ml_host_value_refinements_60f2d305c13ab15c98c8e68490bd3a07ea853e21742955f6c85bc68279fc0396 });
  ml_validate_rust_value(transaction_id, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "AcceptanceFailure", ["kind"]: kind, ["phase"]: phase, ["transaction_id"]: transaction_id, ["message"]: message });
}

export const translated = { ["ACCEPTANCE_TIMEOUT"]: rp_63726564656e7469616c5f616363657074616e63652e414343455054414e43455f54494d454f5554(), ["STAGING_DIRECTORY"]: rp_63726564656e7469616c5f616363657074616e63652e53544147494e475f4449524543544f5259(), ["AcceptancePhase"]: Object.freeze({ ["Preflight"]: ml_make_AcceptancePhase_Preflight, ["Exchange"]: ml_make_AcceptancePhase_Exchange, ["Persistence"]: ml_make_AcceptancePhase_Persistence, ["Catalog"]: ml_make_AcceptancePhase_Catalog, ["Promotion"]: ml_make_AcceptancePhase_Promotion }), ["AcceptanceFailureKind"]: Object.freeze({ ["NotAttempted"]: ml_make_AcceptanceFailureKind_NotAttempted, ["ExchangeRejected"]: ml_make_AcceptanceFailureKind_ExchangeRejected, ["ExchangeUncertain"]: ml_make_AcceptanceFailureKind_ExchangeUncertain, ["PersistenceUncertain"]: ml_make_AcceptanceFailureKind_PersistenceUncertain, ["SuccessorRetained"]: ml_make_AcceptanceFailureKind_SuccessorRetained }), ["AcceptanceFailure"]: ml_make_AcceptanceFailure_AcceptanceFailure };
export const provenance = {"sourcePath":"src/credential_acceptance.rs","sourceSha256":"4a10a1e016936d2f4dd8fddc21ed400f8ed72794343b09d5bc2e779525231b10","executable":5,"executableFunctions":0,"executableConstants":2,"executableTypes":3,"executableConstructors":11,"carried":21,"preserved":27,"runtimeParity":false};
