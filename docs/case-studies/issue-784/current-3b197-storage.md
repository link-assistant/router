# Published 3b197 artifact copies

The next complete CI cycle needs room under the unchanged 500 MB task evidence
limit. Retire only the 25 ZIP working-tree copies already published in immutable
commit `815527efb3db40ca7e650ba9aaae47bfa1529dab`. Every complete local file matches
its full Git blob, SHA-256 and the remote directory tree. Ownership, file identity
and absence from observed open/mapped paths are rechecked before removal.

The [complete retirement receipt](evidence/ci-3b197-artifact-local-retirement.json.gz)
retains every digest, Git blob and permanent download URL. All available complete
job logs, artifact verification records, the complete workflow ZIP and the
original 165-file manifest remain local. The missing forward-5 log remains an
explicit missing observation. No CI failure or source limitation is waived.

This reclaims 89,323,993 logical bytes and 89,378,816 allocated bytes. No build
directory, active file, other worktree or foreign process is modified.
[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
