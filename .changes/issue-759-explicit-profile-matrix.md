Source-only, untested analysis helper for independently resolved explicit
neutral, Unix-family and Windows-family compilation profiles. It preserves
the neutral test:false profile and all original tracked source hashes, assigns
distinct profile directories and context digests, and returns actual configured
module graphs, namespace scopes, diagnostics and macro frontiers separately.
No namespaces, aliases, declarations or executable contexts are concatenated.

The recorded original lib.rs Unix module declaration spans UTF16 4310..4345.
Default neutral uncertainty is not removed: conditional macro export tests
retain it, while explicit family analysis records its own active/inactive graph.
Unknown OS, feature, cfg_attr and residual target domains remain obligations.
The helper emits no common executable and changes no bulk path, parity gap,
production profile, original Rust source or generated artifact.

Ten authored cases, including two complete-original-file hash pins and
namespace/profile segregation, remain unrun while the publisher owns its
compiler window. The original pair test explicitly retains all other missing
crate module obligations; it is not a complete-crate coverage claim.

Source-only review followup freezes the complete original graph before any
namespace composition callback and verifies its source/profile identity.
Reads are bounded to 20,000 tracked paths, 16 entries, 8 MiB per original file
and 64 MiB total; an exceeded budget stops before reading subsequent files.
Profile wrapper/accessor/proxy checks use data descriptors before selection.
These changes and their mutation/budget negatives are also untested.
