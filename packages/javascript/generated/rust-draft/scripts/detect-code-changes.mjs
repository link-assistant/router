// Generated draft from scripts/detect-code-changes.rs; sha256=5de76c5232d13baa340f7813a84591ed0c8fb872983e5cf024e4303250edc8a9
// Carried constructs are data, never runtime parity evidence.
function is_manifest_or_lockfile_change(file_path) {
  return (file_path.endsWith(".toml") || file_path.endsWith("Cargo.lock"));
}

export const translated = { is_manifest_or_lockfile_change };
export const provenance = {"sourcePath":"scripts/detect-code-changes.rs","sourceSha256":"5de76c5232d13baa340f7813a84591ed0c8fb872983e5cf024e4303250edc8a9","executable":1,"carried":13,"preserved":14,"runtimeParity":false};
