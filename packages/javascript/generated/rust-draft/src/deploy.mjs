// Generated draft from src/deploy.rs; sha256=0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

function rp_6465706c6f792e434f4e5441494e4552() {
  return "router-deploy";
}

function rp_6465706c6f792e52454c4159() {
  return "router-deploy-relay";
}

function rp_6465706c6f792e4e4554574f524b() {
  return "router-deploy-network";
}

function rp_6465706c6f792e4241434b454e445f505245464958() {
  return "router-deploy-backend-";
}

function rp_6465706c6f792e4c4142454c5f4b4559() {
  return "com.link-assistant.router.deploy";
}

function rp_6465706c6f792e4c4142454c() {
  return "com.link-assistant.router.deploy=1";
}

function rp_6465706c6f792e44454641554c545f504f5254() {
  return 8080n;
}

function rp_6465706c6f792e4845414c54485f54494d454f5554() {
  return ml_host_std_time_duration_from_secs(60n);
}

function rp_6465706c6f792e4445504c4f595f544f4b454e5f4c4142454c() {
  return "deploy";
}

export const translated = { ["CONTAINER"]: rp_6465706c6f792e434f4e5441494e4552(), ["RELAY"]: rp_6465706c6f792e52454c4159(), ["NETWORK"]: rp_6465706c6f792e4e4554574f524b(), ["BACKEND_PREFIX"]: rp_6465706c6f792e4241434b454e445f505245464958(), ["LABEL_KEY"]: rp_6465706c6f792e4c4142454c5f4b4559(), ["LABEL"]: rp_6465706c6f792e4c4142454c(), ["DEFAULT_PORT"]: rp_6465706c6f792e44454641554c545f504f5254(), ["HEALTH_TIMEOUT"]: rp_6465706c6f792e4845414c54485f54494d454f5554(), ["DEPLOY_TOKEN_LABEL"]: rp_6465706c6f792e4445504c4f595f544f4b454e5f4c4142454c() };
export const provenance = {"sourcePath":"src/deploy.rs","sourceSha256":"0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a","executable":9,"executableFunctions":0,"executableConstants":9,"executableTypes":0,"executableConstructors":0,"carried":27,"preserved":37,"runtimeParity":false};
