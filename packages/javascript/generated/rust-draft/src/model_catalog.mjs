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
  num: {

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

function rp_6d6f64656c5f636174616c6f672e5045525349535445445f434154414c4f475f46494c45() {
  return "model-catalogs.json";
}

function rp_6d6f64656c5f636174616c6f672e434154414c4f475f494e56414c49444154494f4e5f444952() {
  return "model-catalog-invalidations";
}

export const translated = { ["CatalogAcceptance"]: Object.freeze({ ["Accepted"]: ml_make_CatalogAcceptance_Accepted, ["MissingSubscription"]: ml_make_CatalogAcceptance_MissingSubscription, ["CredentialRejected"]: ml_make_CatalogAcceptance_CredentialRejected, ["Unverified"]: ml_make_CatalogAcceptance_Unverified }), ["CATALOG_TTL"]: rp_6d6f64656c5f636174616c6f672e434154414c4f475f54544c(), ["FETCH_TIMEOUT"]: rp_6d6f64656c5f636174616c6f672e46455443485f54494d454f5554(), ["PERSISTED_CATALOG_FILE"]: rp_6d6f64656c5f636174616c6f672e5045525349535445445f434154414c4f475f46494c45(), ["CATALOG_INVALIDATION_DIR"]: rp_6d6f64656c5f636174616c6f672e434154414c4f475f494e56414c49444154494f4e5f444952() };
export const provenance = {"sourcePath":"src/model_catalog.rs","sourceSha256":"2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5","executable":5,"executableFunctions":0,"executableConstants":4,"executableTypes":1,"executableConstructors":4,"carried":39,"preserved":45,"runtimeParity":false};
