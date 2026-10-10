// Generated draft from docs/case-studies/issue-759/raw/sources/rust-ai-driven-development-pipeline-template/files/scripts/check-release-needed.rs; sha256=e53ad7f8c6ecf68a94b73aac17bb7f6a5af18f9e21df20cbf796afa3032d148d
// Carried constructs are data, never runtime parity evidence.
function release_is_complete(crate_published: boolean, dockerhub_required: boolean, dockerhub_published: boolean, github_release_published: boolean) {
  if (!(typeof crate_published === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof dockerhub_required === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof dockerhub_published === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof github_release_published === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return ((crate_published && (!dockerhub_required || dockerhub_published)) && github_release_published);
}

export const translated: { "release_is_complete": (crate_published: boolean, dockerhub_required: boolean, dockerhub_published: boolean, github_release_published: boolean) => boolean } = { release_is_complete };
export const provenance = {"sourcePath":"docs/case-studies/issue-759/raw/sources/rust-ai-driven-development-pipeline-template/files/scripts/check-release-needed.rs","sourceSha256":"e53ad7f8c6ecf68a94b73aac17bb7f6a5af18f9e21df20cbf796afa3032d148d","executable":1,"executableFunctions":1,"executableConstants":0,"carried":21,"preserved":22,"runtimeParity":false};
