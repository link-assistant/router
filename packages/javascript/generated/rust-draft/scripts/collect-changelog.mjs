// Generated draft from scripts/collect-changelog.rs; sha256=e231a3bfbab5171773478c3b1d93f26f7e69e45d8744b8a72c780da526972efa
// Carried constructs are data, never runtime parity evidence.
function INSERT_MARKER() {
  return "<!-- changelog-insert-here -->";
}

function get_cargo_toml_path(rust_root) {
  if ((rust_root === ".")) {
    return "./Cargo.toml";
  } else {
    return (rust_root + "/Cargo.toml");
  }
}

function get_changelog_dir(rust_root) {
  if ((rust_root === ".")) {
    return "./changelog.d";
  } else {
    return (rust_root + "/changelog.d");
  }
}

function get_changelog_path(rust_root) {
  if ((rust_root === ".")) {
    return "./CHANGELOG.md";
  } else {
    return (rust_root + "/CHANGELOG.md");
  }
}

export const translated = { "INSERT_MARKER": INSERT_MARKER(), get_cargo_toml_path, get_changelog_dir, get_changelog_path };
export const provenance = {"sourcePath":"scripts/collect-changelog.rs","sourceSha256":"e231a3bfbab5171773478c3b1d93f26f7e69e45d8744b8a72c780da526972efa","executable":4,"carried":14,"preserved":18,"runtimeParity":false};
