// Generated draft from scripts/bump-version.rs; sha256=1c0ca091123e298f6e5cc02b6b9a01a0172088c252dbaf9e9ce9348a412fe723
// Carried constructs are data, never runtime parity evidence.
function get_cargo_toml_path(rust_root) {
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

export const translated = { get_cargo_toml_path };
export const provenance = {"sourcePath":"scripts/bump-version.rs","sourceSha256":"1c0ca091123e298f6e5cc02b6b9a01a0172088c252dbaf9e9ce9348a412fe723","executable":1,"carried":15,"preserved":16,"runtimeParity":false};
