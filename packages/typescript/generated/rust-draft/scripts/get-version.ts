// Generated draft from scripts/get-version.rs; sha256=321b8b8a0094818b5f729e6183626dcdd442e5a1d7ec02bf5ad9cf61326802b6
// Carried constructs are data, never runtime parity evidence.
function get_cargo_toml_path(rust_root: string) {
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

export const translated: { "get_cargo_toml_path": (rust_root: string) => string } = { get_cargo_toml_path };
export const provenance = {"sourcePath":"scripts/get-version.rs","sourceSha256":"321b8b8a0094818b5f729e6183626dcdd442e5a1d7ec02bf5ad9cf61326802b6","executable":1,"carried":9,"preserved":10,"runtimeParity":false};
