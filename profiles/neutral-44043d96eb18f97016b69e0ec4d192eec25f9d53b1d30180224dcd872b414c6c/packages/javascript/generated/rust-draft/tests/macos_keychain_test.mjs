// Generated draft from tests/macos_keychain_test.rs; sha256=58e904f7a018c9f3fe556a2e7da756323c232f9d769bc257dcc67af3ee1b8433
// Carried constructs are data, never runtime parity evidence.
function SEEDED_ACCESS_TOKEN() {
  return "keychain-ci-fake-access-token";
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

function STALE_FILE_TOKEN() {
  return "file-ci-stale-access-token";
}

function SCOPED_DIR() {
  return "/tmp/router-keychain-ci";
}

export const translated = { ["SEEDED_ACCESS_TOKEN"]: SEEDED_ACCESS_TOKEN(), ["STALE_FILE_TOKEN"]: STALE_FILE_TOKEN(), ["SCOPED_DIR"]: SCOPED_DIR() };
export const provenance = {"sourcePath":"tests/macos_keychain_test.rs","sourceSha256":"58e904f7a018c9f3fe556a2e7da756323c232f9d769bc257dcc67af3ee1b8433","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":8,"preserved":12,"runtimeParity":false};
