// Generated draft from src/managed_server.rs; sha256=761e3824977dd68506291bbe97aa5aea5ee26f6b5750dd381ac8926f051beb33
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_LOCAL_PORT() {
  return 8080n;
}

function CONFIG_DIRECTORY() {
  return "link-assistant-router";
}

function SERVER_CONFIG() {
  return "server.json";
}

function MANAGED_STATE() {
  return "managed-server.json";
}

function MANAGED_LOCK() {
  return "managed-server.lock";
}

function CONTAINER() {
  return "link-assistant-router-managed";
}

function VOLUME() {
  return "link-assistant-router-managed-data";
}

function IMAGE() {
  return "ghcr.io/link-assistant/router:latest";
}

function MANAGED_LABEL() {
  return "com.link-assistant.router.managed=1";
}

export const translated: { "DEFAULT_LOCAL_PORT": bigint; "CONFIG_DIRECTORY": string; "SERVER_CONFIG": string; "MANAGED_STATE": string; "MANAGED_LOCK": string; "CONTAINER": string; "VOLUME": string; "IMAGE": string; "MANAGED_LABEL": string } = { "DEFAULT_LOCAL_PORT": DEFAULT_LOCAL_PORT(), "CONFIG_DIRECTORY": CONFIG_DIRECTORY(), "SERVER_CONFIG": SERVER_CONFIG(), "MANAGED_STATE": MANAGED_STATE(), "MANAGED_LOCK": MANAGED_LOCK(), "CONTAINER": CONTAINER(), "VOLUME": VOLUME(), "IMAGE": IMAGE(), "MANAGED_LABEL": MANAGED_LABEL() };
export const provenance = {"sourcePath":"src/managed_server.rs","sourceSha256":"761e3824977dd68506291bbe97aa5aea5ee26f6b5750dd381ac8926f051beb33","executable":9,"carried":76,"preserved":86,"runtimeParity":false};
