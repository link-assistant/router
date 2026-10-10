// Generated draft from scripts/rust-paths.rs; sha256=264592d7626f495454825cfd215b33dd25a9f3c9ffc7d05dd0cb68d9e1819a5f
// Carried constructs are data, never runtime parity evidence.
function needs_cd(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  return (rust_root !== ".");
}

export const translated = { needs_cd };
export const provenance = {"sourcePath":"scripts/rust-paths.rs","sourceSha256":"264592d7626f495454825cfd215b33dd25a9f3c9ffc7d05dd0cb68d9e1819a5f","executable":1,"executableFunctions":1,"executableConstants":0,"carried":9,"preserved":10,"runtimeParity":false};
