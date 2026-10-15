### Changed

- Regenerated the complete JavaScript, TypeScript, serialized meta and project
  drafts for the canonical, neutral, Unix and Windows profiles using the
  coordinated translation-rule batch. Generation uses the separately ordered
  language and repository pipelines and includes constructor value isolation,
  source-backed reverse constructor checks, and four new Rust edge-case tests
  preserved as source. No Rust checks ran locally.
- Both generation commands passed their existing deadlines with unchanged
  compiler and original inputs: 10,661 output files, totaling 619,176,668 bytes.
  The canonical profile executes 139 of 2,543 production functions; preserved
  source, metadata observations and partial project drafts do not establish
  complete runtime parity. Focused receiving checks and the full gate remain
  separate requirements.
