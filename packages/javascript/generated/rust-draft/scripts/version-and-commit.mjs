// Generated draft from scripts/version-and-commit.rs; sha256=84a40f7ecda5fff955155dc7e760577d9b1f955d7e83b8f69423c94c85e7a869
// Carried constructs are data, never runtime parity evidence.
function get_cargo_toml_path(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

function get_cargo_lock_path(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./Cargo.lock";
  } else {
    return (rust_root + "/Cargo.lock");
  }
}

function get_changelog_dir(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./changelog.d";
  } else {
    return (rust_root + "/changelog.d");
  }
}

function get_changelog_path(rust_root) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./CHANGELOG.md";
  } else {
    return (rust_root + "/CHANGELOG.md");
  }
}

export const translated = { get_cargo_toml_path, get_cargo_lock_path, get_changelog_dir, get_changelog_path };
export const provenance = {"sourcePath":"scripts/version-and-commit.rs","sourceSha256":"84a40f7ecda5fff955155dc7e760577d9b1f955d7e83b8f69423c94c85e7a869","executable":4,"executableFunctions":4,"executableConstants":0,"carried":21,"preserved":25,"runtimeParity":false};
