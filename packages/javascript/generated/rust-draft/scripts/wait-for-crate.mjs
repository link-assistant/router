// Generated draft from scripts/wait-for-crate.rs; sha256=25f7a2b8da321abf9d0a53ba9cc0c854281f6e6e075fdf6f25e1c5c7f06e3873
// Carried constructs are data, never runtime parity evidence.
function get_cargo_toml_path(rust_root) {
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

export const translated = { get_cargo_toml_path };
export const provenance = {"sourcePath":"scripts/wait-for-crate.rs","sourceSha256":"25f7a2b8da321abf9d0a53ba9cc0c854281f6e6e075fdf6f25e1c5c7f06e3873","executable":1,"carried":14,"preserved":15,"runtimeParity":false};
