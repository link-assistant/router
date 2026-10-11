Source-only, untested draft of reusable Rust 1.89 borrowed string line views,
fresh immediate next consumption, checked Vec<&str>/slice join, and actual
str trim function-item callbacks. Original .rs files are unchanged. Runtime
views validate Unicode scalars, preserve LF/CRLF/lone-CR and empty-line rules,
and reject arbitrary cursor dispatch, array prototypes, proxies and getters.
Generated operations remain ineligible for constant evaluation; owned String
borrow creation, stored cursors and custom Borrow/iterator traits remain gaps.

The fresh pre-draft library diagnostics report exactly "method lines: outside
the portable core" for unchanged deploy::first_line, storage::sanitize_codec_error,
responses::extract_sse_data and output_limit::data_payload. The first three have
full-original-file fixtures with UTF16 span/declaration/source hash pins. The
fourth additionally needs bool.then_some and is not claimed by this draft.
Rust core str archives are reused; new alloc slice/str archives pin the actual
Join<&str> owner and are retained with MIT/Apache-2.0 licenses and checksums.

No compiler, tests, corpus producer, Rust execution or artifact regeneration
has run on this branch. No executable gain or runtime parity is established.
