// Generated draft from scripts/get-bump-type.rs; sha256=da45d4eb202e38358641077a4e8972baa9ddc9bc1dfedee80384604ef9434cc3
// Carried constructs are data, never runtime parity evidence.
function get_changelog_dir(rust_root) {
  if ((rust_root === ".")) {
    return "./changelog.d";
  } else {
    return (rust_root + "/changelog.d");
  }
}

export const translated = { get_changelog_dir };
export const provenance = {"sourcePath":"scripts/get-bump-type.rs","sourceSha256":"da45d4eb202e38358641077a4e8972baa9ddc9bc1dfedee80384604ef9434cc3","executable":1,"carried":13,"preserved":14,"runtimeParity":false};
