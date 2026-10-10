// Generated draft from scripts/create-changelog-fragment.rs; sha256=4b0149755d96c478da84f1842f82efa85b41a870abde4177c0373db200605711
// Carried constructs are data, never runtime parity evidence.
function get_category(bump_type) {
  if (!(typeof bump_type === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(bump_type))) throw new TypeError('argument outside supported Rust value domain');
  if ((bump_type === "major")) {
    return "### Breaking Changes";
  } else {
    if ((bump_type === "minor")) {
      return "### Added";
    } else {
      if ((bump_type === "patch")) {
        return "### Fixed";
      } else {
        return "### Changed";
      }
    }
  }
}

export const translated = { get_category };
export const provenance = {"sourcePath":"scripts/create-changelog-fragment.rs","sourceSha256":"4b0149755d96c478da84f1842f82efa85b41a870abde4177c0373db200605711","executable":1,"executableFunctions":1,"executableConstants":0,"carried":8,"preserved":9,"runtimeParity":false};
