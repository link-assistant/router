// Generated draft from scripts/record-vendor-fixtures.rs; sha256=ffd40ce3c3306020250a471efbde7492677bf41d0aeb27676e98c68bf5442d5c
// Carried constructs are data, never runtime parity evidence.
function SCHEMA() {
  return "link-assistant-router/vendor-cassette/v1";
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

function KEPT_HEADERS() {
  return Object.freeze(["content-type", "retry-after"]);
}

function FORBIDDEN() {
  return Object.freeze(["sk-ant-", "sk-proj-", "bearer ", "ya29.", "aiza", "anthropic-organization-id", "openai-organization", "set-cookie"]);
}

export const translated = { ["SCHEMA"]: SCHEMA(), ["KEPT_HEADERS"]: KEPT_HEADERS(), ["FORBIDDEN"]: FORBIDDEN() };
export const provenance = {"sourcePath":"scripts/record-vendor-fixtures.rs","sourceSha256":"ffd40ce3c3306020250a471efbde7492677bf41d0aeb27676e98c68bf5442d5c","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":13,"runtimeParity":false};
