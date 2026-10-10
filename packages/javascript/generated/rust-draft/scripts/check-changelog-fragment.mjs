// Generated draft from scripts/check-changelog-fragment.rs; sha256=e5517aaf59acb6ac8b3e2f797497ec5bde9e4050f78330f2f511d39836384710
// Carried constructs are data, never runtime parity evidence.
function is_changelog_fragment(file_path) {
  return ((file_path.startsWith("changelog.d/") && file_path.endsWith(".md")) && !file_path.endsWith("README.md"));
}

function MAX_PENDING_FRAGMENTS() {
  return 40n;
}

export const translated = { is_changelog_fragment, "MAX_PENDING_FRAGMENTS": MAX_PENDING_FRAGMENTS() };
export const provenance = {"sourcePath":"scripts/check-changelog-fragment.rs","sourceSha256":"e5517aaf59acb6ac8b3e2f797497ec5bde9e4050f78330f2f511d39836384710","executable":2,"carried":8,"preserved":10,"runtimeParity":false};
