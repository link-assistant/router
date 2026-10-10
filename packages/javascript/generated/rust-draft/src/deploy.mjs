// Generated draft from src/deploy.rs; sha256=0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a
// Carried constructs are data, never runtime parity evidence.
function CONTAINER() {
  return "router-deploy";
}

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

function DEPLOY_TOKEN_LABEL() {
  return "deploy";
}

export const translated = { "CONTAINER": CONTAINER(), "RELAY": RELAY(), "NETWORK": NETWORK(), "BACKEND_PREFIX": BACKEND_PREFIX(), "LABEL_KEY": LABEL_KEY(), "LABEL": LABEL(), "DEFAULT_PORT": DEFAULT_PORT(), "DEPLOY_TOKEN_LABEL": DEPLOY_TOKEN_LABEL() };
export const provenance = {"sourcePath":"src/deploy.rs","sourceSha256":"0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a","executable":8,"executableFunctions":0,"executableConstants":8,"carried":28,"preserved":37,"runtimeParity":false};
