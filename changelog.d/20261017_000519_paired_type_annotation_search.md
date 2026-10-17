### Changed

- Replace a whole-token filter per paired TypeScript annotation with an upper
  bound search over the same fresh scanner token ends. The chosen predecessor,
  including comments, and all source, CST, native syntax, type and refusal
  checks remain unchanged. No across-call source or verdict cache is added.
- Extend existing case two with complete 1024-function paired sources, all
  2049 erasures and their whole inverse, plus late-body and comment-boundary
  negatives. All eight titles and 60-second/strict 20-second limits remain.
- This is a source-only UNRUN experiment, with no measured speed claim. Full
  per-item source serialization still duplicates source and remains subject to
  existing bounds; a separate document-source proposal is not implemented here.
