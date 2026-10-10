// Generated draft from scripts/wait-for-crate.rs; sha256=25f7a2b8da321abf9d0a53ba9cc0c854281f6e6e075fdf6f25e1c5c7f06e3873
// Carried constructs are data, never runtime parity evidence.
function get_cargo_toml_path(rust_root: string) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

export const translated: { "get_cargo_toml_path": (rust_root: string) => string } = { get_cargo_toml_path };
export const provenance = {"sourcePath":"scripts/wait-for-crate.rs","sourceSha256":"25f7a2b8da321abf9d0a53ba9cc0c854281f6e6e075fdf6f25e1c5c7f06e3873","executable":1,"executableFunctions":1,"executableConstants":0,"carried":14,"preserved":15,"runtimeParity":false};
