The complete original Rust 1.89.0 alloc String source is copied byte for byte
from the existing utf16-fixed-f64 profile. Its original and gzip hashes are
pinned in manifest.json. Original Rust licenses (MIT OR Apache-2.0) remain in
../copy-standard; the existing standard profiles retain the original download
URLs and licenses. No dependency source or retrieval evidence was discarded.

format-display-source.mjs selects the actual std -> alloc -> core fmt exports,
core Display schema, original fmt_refs expansion, FormattingOptions/Formatter
constructors, default pad/write_str branches and String Write/push_str bodies.
Private original caller frames and the full module implementation census select
one coherent nominal Display implementation. The bounded consumer accepts
only named nominal function parameters and an exact shared Display forwarder
to its independently checked inherent borrowed-str method. Default source
control must write exactly that checked string slot. It does not establish
allocator effects, native writer ABI, general formatting specs or I/O parity.

../../fixtures/source-format-display-evidence/receipt.json retains every full
final Node/Bun vector,
complete historical failure/pass streams and available failed-source snapshots.
The complete original SubscriptionProvider Display body compiles as control,
but the exact refresh_failure_diagnostic body still refuses independently:
its actual namespace projection has an unresolved ancestor bang macro scope.
No original enclosing Router function gain or complete parity is claimed.
