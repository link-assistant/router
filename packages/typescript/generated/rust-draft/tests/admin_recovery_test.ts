// Generated draft from tests/admin_recovery_test.rs; sha256=e6002b6bcd4dd795e02c094823fcfd7c9170f2168a10a35f7bbc4f75decd776c
// Carried constructs are data, never runtime parity evidence.
function SECRET() {
  return "admin-recovery-end-to-end-secret";
}

function ATTEMPTS() {
  return 5n;
}

export const translated: { "SECRET": string; "ATTEMPTS": bigint } = { "SECRET": SECRET(), "ATTEMPTS": ATTEMPTS() };
export const provenance = {"sourcePath":"tests/admin_recovery_test.rs","sourceSha256":"e6002b6bcd4dd795e02c094823fcfd7c9170f2168a10a35f7bbc4f75decd776c","executable":2,"carried":19,"preserved":22,"runtimeParity":false};
