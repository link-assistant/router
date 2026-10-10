// Generated draft from scripts/publish-crate.rs; sha256=e066aa5277cf2d155cb18eee4a709450663fe4b5f68555f20b7de2c3e2f1f6c5
// Carried constructs are data, never runtime parity evidence.
function get_cargo_toml_path(rust_root: string) {
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

function needs_cd(rust_root: string) {
  return (rust_root !== ".");
}

export const translated: { "get_cargo_toml_path": (rust_root: string) => string; "needs_cd": (rust_root: string) => boolean } = { get_cargo_toml_path, needs_cd };
export const provenance = {"sourcePath":"scripts/publish-crate.rs","sourceSha256":"e066aa5277cf2d155cb18eee4a709450663fe4b5f68555f20b7de2c3e2f1f6c5","executable":2,"carried":11,"preserved":13,"runtimeParity":false};
