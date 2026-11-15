# Actual Option parent contexts

Four original Option cases selected a physical application leaf as the crate
root, so qualified `crate::translation_core` usages had no actual facade edge.
The receiving helper now explicitly projects the two complete module declarations
from the actual library root and retains every complete physical descendant.
The projection has its own source identity and is labeled separately from the
complete library root. The producer's namespace and source-origin checks remain
unchanged. A root projection does not qualify the whole production crate.

The first three changed cases pass in both complete Node attempts and Bun.
The complete files still fail: the unchanged subscription-usage case takes
95.786 seconds with a 384 MiB Node heap and 90.046 seconds with a 448 MiB heap,
against its original 60-second deadline. Both Node processes subsequently
exhaust their bounded heaps before completing the remaining cases. Bun reaches
the unchanged cgroup stop threshold. The changed stream-termination case and
every remaining whole-file criterion remain unqualified. No deadlines, source
files, assertions or semantic refusal checks were removed or relaxed.

The [complete packet](evidence/current-option-context.json.gz) retains whole
original/current tests, actual physical parents, the projected-context tracer,
all attempted complete-file streams, resource receipts and available complete
Node audits. Every embedded member was read back and SHA256 verified.

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
This context repair supplies no full-gate, whole-file, whole-crate or runtime
parity success. No Rust was run. Newly executable production functions measured:
zero.
