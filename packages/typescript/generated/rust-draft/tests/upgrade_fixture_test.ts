// Generated draft from tests/upgrade_fixture_test.rs; sha256=97f7e362dc05f5cbbb782b99e81f06213f4177e1c48e0d6965832c9a2d314c29
// Carried constructs are data, never runtime parity evidence.
function SECRET() {
  return "upgrade-matrix-secret-0123456789abcdef";
}

function PROVIDER() {
  return "upgrade-stub";
}

function PROVIDER_KEY() {
  return "upgrade-matrix-fake-api-key";
}

function SERVER_URL() {
  return "http://127.0.0.1:18080";
}

export const translated: { "SECRET": string; "PROVIDER": string; "PROVIDER_KEY": string; "SERVER_URL": string } = { "SECRET": SECRET(), "PROVIDER": PROVIDER(), "PROVIDER_KEY": PROVIDER_KEY(), "SERVER_URL": SERVER_URL() };
export const provenance = {"sourcePath":"tests/upgrade_fixture_test.rs","sourceSha256":"97f7e362dc05f5cbbb782b99e81f06213f4177e1c48e0d6965832c9a2d314c29","executable":4,"carried":16,"preserved":21,"runtimeParity":false};
