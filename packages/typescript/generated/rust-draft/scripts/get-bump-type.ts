// Generated draft from scripts/get-bump-type.rs; sha256=da45d4eb202e38358641077a4e8972baa9ddc9bc1dfedee80384604ef9434cc3
// Carried constructs are data, never runtime parity evidence.
function get_changelog_dir(rust_root: string) {
  if (!(typeof rust_root === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(rust_root))) throw new TypeError('argument outside supported Rust value domain');
  if ((rust_root === ".")) {
    return "./changelog.d";
  } else {
    return (rust_root + "/changelog.d");
  }
}

function bump_priority(bump_type: string) {
  if (!(typeof bump_type === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(bump_type))) throw new TypeError('argument outside supported Rust value domain');
  if ((bump_type === "patch")) {
    return 1n;
  } else {
    if ((bump_type === "minor")) {
      return 2n;
    } else {
      if ((bump_type === "major")) {
        return 3n;
      } else {
        return 0n;
      }
    }
  }
}

export const translated: { "get_changelog_dir": (rust_root: string) => string; "bump_priority": (bump_type: string) => bigint } = { get_changelog_dir, bump_priority };
export const provenance = {"sourcePath":"scripts/get-bump-type.rs","sourceSha256":"da45d4eb202e38358641077a4e8972baa9ddc9bc1dfedee80384604ef9434cc3","executable":2,"executableFunctions":2,"executableConstants":0,"carried":12,"preserved":14,"runtimeParity":false};
