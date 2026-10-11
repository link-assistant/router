// Generated draft from src/credential_acceptance.rs; sha256=4a10a1e016936d2f4dd8fddc21ed400f8ed72794343b09d5bc2e779525231b10
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

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

export const translated = { ["ACCEPTANCE_TIMEOUT"]: rp_63726564656e7469616c5f616363657074616e63652e414343455054414e43455f54494d454f5554(), ["STAGING_DIRECTORY"]: rp_63726564656e7469616c5f616363657074616e63652e53544147494e475f4449524543544f5259(), ["AcceptancePhase"]: Object.freeze({ ["Preflight"]: ml_make_AcceptancePhase_Preflight, ["Exchange"]: ml_make_AcceptancePhase_Exchange, ["Persistence"]: ml_make_AcceptancePhase_Persistence, ["Catalog"]: ml_make_AcceptancePhase_Catalog, ["Promotion"]: ml_make_AcceptancePhase_Promotion }), ["AcceptanceFailureKind"]: Object.freeze({ ["NotAttempted"]: ml_make_AcceptanceFailureKind_NotAttempted, ["ExchangeRejected"]: ml_make_AcceptanceFailureKind_ExchangeRejected, ["ExchangeUncertain"]: ml_make_AcceptanceFailureKind_ExchangeUncertain, ["PersistenceUncertain"]: ml_make_AcceptanceFailureKind_PersistenceUncertain, ["SuccessorRetained"]: ml_make_AcceptanceFailureKind_SuccessorRetained }) };
export const provenance = {"sourcePath":"src/credential_acceptance.rs","sourceSha256":"4a10a1e016936d2f4dd8fddc21ed400f8ed72794343b09d5bc2e779525231b10","executable":4,"executableFunctions":0,"executableConstants":2,"executableTypes":2,"executableConstructors":10,"carried":22,"preserved":27,"runtimeParity":false};
