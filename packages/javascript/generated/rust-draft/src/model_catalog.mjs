// Generated draft from src/model_catalog.rs; sha256=2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_CatalogAcceptance_Accepted() {
  return Object.freeze({ $: 'Accepted' });
}

function ml_make_CatalogAcceptance_MissingSubscription() {
  return Object.freeze({ $: 'MissingSubscription' });
}

function ml_make_CatalogAcceptance_CredentialRejected() {
  return Object.freeze({ $: 'CredentialRejected' });
}

function ml_make_CatalogAcceptance_Unverified() {
  return Object.freeze({ $: 'Unverified' });
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

function rp_6d6f64656c5f636174616c6f672e434154414c4f475f54544c() {
  return ml_host_std_time_duration_from_secs(ml_fixed((5n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow"));
}

function rp_6d6f64656c5f636174616c6f672e46455443485f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(15n);
}

function MAX_CATALOG_PAGES() {
  return 100n;
}

function PERSISTED_CATALOG_VERSION() {
  return 1n;
}

function PERSISTED_CATALOG_FILE() {
  return "model-catalogs.json";
}

function CATALOG_INVALIDATION_DIR() {
  return "model-catalog-invalidations";
}

export const translated = { ["CatalogAcceptance"]: Object.freeze({ ["Accepted"]: ml_make_CatalogAcceptance_Accepted, ["MissingSubscription"]: ml_make_CatalogAcceptance_MissingSubscription, ["CredentialRejected"]: ml_make_CatalogAcceptance_CredentialRejected, ["Unverified"]: ml_make_CatalogAcceptance_Unverified }), ["CATALOG_TTL"]: rp_6d6f64656c5f636174616c6f672e434154414c4f475f54544c(), ["FETCH_TIMEOUT"]: rp_6d6f64656c5f636174616c6f672e46455443485f54494d454f5554(), ["MAX_CATALOG_PAGES"]: MAX_CATALOG_PAGES(), ["PERSISTED_CATALOG_VERSION"]: PERSISTED_CATALOG_VERSION(), ["PERSISTED_CATALOG_FILE"]: PERSISTED_CATALOG_FILE(), ["CATALOG_INVALIDATION_DIR"]: CATALOG_INVALIDATION_DIR() };
export const provenance = {"sourcePath":"src/model_catalog.rs","sourceSha256":"2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5","executable":7,"executableFunctions":0,"executableConstants":6,"executableTypes":1,"executableConstructors":4,"carried":37,"preserved":45,"runtimeParity":false};
