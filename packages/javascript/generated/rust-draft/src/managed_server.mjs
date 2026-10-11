// Generated draft from src/managed_server.rs; sha256=761e3824977dd68506291bbe97aa5aea5ee26f6b5750dd381ac8926f051beb33
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function DEFAULT_LOCAL_PORT() {
  return 8080n;
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

function ml_make_CredentialOptions_CredentialOptions(ttl_hours, sliding, allow_supplied, ephemeral) {
  ml_fixed(ttl_hours, -9223372036854775808n, 9223372036854775807n, "i64 argument ttl_hours out of range");
  if (!(typeof ttl_hours === 'bigint' && ttl_hours >= -9223372036854775808n && ttl_hours <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof sliding === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof allow_supplied === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof ephemeral === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "CredentialOptions", ["ttl_hours"]: ttl_hours, ["sliding"]: sliding, ["allow_supplied"]: allow_supplied, ["ephemeral"]: ephemeral });
}

export const translated = { ["DEFAULT_LOCAL_PORT"]: DEFAULT_LOCAL_PORT(), ["CONFIG_DIRECTORY"]: CONFIG_DIRECTORY(), ["SERVER_CONFIG"]: SERVER_CONFIG(), ["MANAGED_STATE"]: MANAGED_STATE(), ["MANAGED_LOCK"]: MANAGED_LOCK(), ["CONTAINER"]: CONTAINER(), ["VOLUME"]: VOLUME(), ["IMAGE"]: IMAGE(), ["MANAGED_LABEL"]: MANAGED_LABEL(), ["CredentialOptions"]: ml_make_CredentialOptions_CredentialOptions };
export const provenance = {"sourcePath":"src/managed_server.rs","sourceSha256":"761e3824977dd68506291bbe97aa5aea5ee26f6b5750dd381ac8926f051beb33","executable":10,"executableFunctions":0,"executableConstants":9,"executableTypes":1,"executableConstructors":1,"carried":75,"preserved":86,"runtimeParity":false};
