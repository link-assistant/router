// Generated draft from src/deploy.rs; sha256=0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function CONTAINER() {
  return "router-deploy";
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

function RELAY() {
  return "router-deploy-relay";
}

function NETWORK() {
  return "router-deploy-network";
}

function BACKEND_PREFIX() {
  return "router-deploy-backend-";
}

function LABEL_KEY() {
  return "com.link-assistant.router.deploy";
}

function LABEL() {
  return "com.link-assistant.router.deploy=1";
}

function DEFAULT_PORT() {
  return 8080n;
}

function rp_6465706c6f792e4845414c54485f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(60n);
}

function DEPLOY_TOKEN_LABEL() {
  return "deploy";
}

export const translated = { ["CONTAINER"]: CONTAINER(), ["RELAY"]: RELAY(), ["NETWORK"]: NETWORK(), ["BACKEND_PREFIX"]: BACKEND_PREFIX(), ["LABEL_KEY"]: LABEL_KEY(), ["LABEL"]: LABEL(), ["DEFAULT_PORT"]: DEFAULT_PORT(), ["HEALTH_TIMEOUT"]: rp_6465706c6f792e4845414c54485f54494d454f5554(), ["DEPLOY_TOKEN_LABEL"]: DEPLOY_TOKEN_LABEL() };
export const provenance = {"sourcePath":"src/deploy.rs","sourceSha256":"0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a","executable":9,"executableFunctions":0,"executableConstants":9,"executableTypes":0,"executableConstructors":0,"carried":27,"preserved":37,"runtimeParity":false};
