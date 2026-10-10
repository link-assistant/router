// Generated draft from scripts/rust-paths.rs; sha256=264592d7626f495454825cfd215b33dd25a9f3c9ffc7d05dd0cb68d9e1819a5f
// Carried constructs are data, never runtime parity evidence.
function needs_cd(rust_root: string) {
  return (rust_root !== ".");
}

export const translated: { "needs_cd": (rust_root: string) => boolean } = { needs_cd };
export const provenance = {"sourcePath":"scripts/rust-paths.rs","sourceSha256":"264592d7626f495454825cfd215b33dd25a9f3c9ffc7d05dd0cb68d9e1819a5f","executable":1,"carried":9,"preserved":10,"runtimeParity":false};
