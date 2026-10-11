// Generated draft from src/managed_server.rs; sha256=761e3824977dd68506291bbe97aa5aea5ee26f6b5750dd381ac8926f051beb33
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6d616e616765645f7365727665722e44454641554c545f4c4f43414c5f504f5254() {
  return 8080n;
}

function rp_6d616e616765645f7365727665722e434f4e4649475f4449524543544f5259() {
  return "link-assistant-router";
}

function rp_6d616e616765645f7365727665722e5345525645525f434f4e464947() {
  return "server.json";
}

function rp_6d616e616765645f7365727665722e4d414e414745445f5354415445() {
  return "managed-server.json";
}

function rp_6d616e616765645f7365727665722e4d414e414745445f4c4f434b() {
  return "managed-server.lock";
}

function rp_6d616e616765645f7365727665722e434f4e5441494e4552() {
  return "link-assistant-router-managed";
}

function rp_6d616e616765645f7365727665722e564f4c554d45() {
  return "link-assistant-router-managed-data";
}

function rp_6d616e616765645f7365727665722e494d414745() {
  return "ghcr.io/link-assistant/router:latest";
}

function rp_6d616e616765645f7365727665722e4d414e414745445f4c4142454c() {
  return "com.link-assistant.router.managed=1";
}

function ml_make_CredentialOptions_CredentialOptions(ttl_hours, sliding, allow_supplied, ephemeral) {
  if (typeof ttl_hours !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(ttl_hours, -9223372036854775808n, 9223372036854775807n, "i64 argument ttl_hours out of range");
  if (!(typeof ttl_hours === 'bigint' && ttl_hours >= -9223372036854775808n && ttl_hours <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof sliding === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof allow_supplied === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof ephemeral === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "CredentialOptions", ["ttl_hours"]: ttl_hours, ["sliding"]: sliding, ["allow_supplied"]: allow_supplied, ["ephemeral"]: ephemeral });
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

export const translated = { ["DEFAULT_LOCAL_PORT"]: rp_6d616e616765645f7365727665722e44454641554c545f4c4f43414c5f504f5254(), ["CONFIG_DIRECTORY"]: rp_6d616e616765645f7365727665722e434f4e4649475f4449524543544f5259(), ["SERVER_CONFIG"]: rp_6d616e616765645f7365727665722e5345525645525f434f4e464947(), ["MANAGED_STATE"]: rp_6d616e616765645f7365727665722e4d414e414745445f5354415445(), ["MANAGED_LOCK"]: rp_6d616e616765645f7365727665722e4d414e414745445f4c4f434b(), ["CONTAINER"]: rp_6d616e616765645f7365727665722e434f4e5441494e4552(), ["VOLUME"]: rp_6d616e616765645f7365727665722e564f4c554d45(), ["IMAGE"]: rp_6d616e616765645f7365727665722e494d414745(), ["MANAGED_LABEL"]: rp_6d616e616765645f7365727665722e4d414e414745445f4c4142454c(), ["CredentialOptions"]: ml_make_CredentialOptions_CredentialOptions };
export const provenance = {"sourcePath":"src/managed_server.rs","sourceSha256":"761e3824977dd68506291bbe97aa5aea5ee26f6b5750dd381ac8926f051beb33","executable":10,"executableFunctions":0,"executableConstants":9,"executableTypes":1,"executableConstructors":1,"carried":75,"preserved":86,"runtimeParity":false};
