// Generated draft from src/refresh_recovery_tests.rs; sha256=c835471e82f1f2d9798c0107d1903312f07f367a4d5f82f638f14dd4688cf1e9
// Carried constructs are data, never runtime parity evidence.
function NOW_MS() {
  return 1700000000000n;
}

function INVALID_GRANT() {
  return "{\"error\":\"invalid_grant\",\"error_description\":\"refresh token not found\"}";
}

export const translated: { "NOW_MS": bigint; "INVALID_GRANT": string } = { "NOW_MS": NOW_MS(), "INVALID_GRANT": INVALID_GRANT() };
export const provenance = {"sourcePath":"src/refresh_recovery_tests.rs","sourceSha256":"c835471e82f1f2d9798c0107d1903312f07f367a4d5f82f638f14dd4688cf1e9","executable":2,"executableFunctions":0,"executableConstants":2,"carried":24,"preserved":27,"runtimeParity":false};
