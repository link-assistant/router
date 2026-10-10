// Generated draft from scripts/check-release-needed.rs; sha256=d417c95c3315bb91bfde2a80886c52166e32ec93398f635daf880e4ae7771fda
// Carried constructs are data, never runtime parity evidence.
function get_cargo_toml_path(rust_root) {
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

export const translated = { get_cargo_toml_path };
export const provenance = {"sourcePath":"scripts/check-release-needed.rs","sourceSha256":"d417c95c3315bb91bfde2a80886c52166e32ec93398f635daf880e4ae7771fda","executable":1,"carried":24,"preserved":25,"runtimeParity":false};
