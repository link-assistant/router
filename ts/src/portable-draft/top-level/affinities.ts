// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/affinities.mjs; source sha256=8a101d57de4ba2ec7267533348bb774c8798e0668924793d4bb97a932e773e6d; IR sha256=46eef230676311331b314a3a9992fa336d21cc7f088618856d8931ff5418f6b7.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function validId(value?: unknown): boolean {
    return (((((typeof value) === "string") && (value.length > 0)) && (Buffer.byteLength(value) <= 256)) && (!/[\u{2f}\u{0}-\u{1f}\u{7f}-\u{9f}]/u.test(value)));
}

function persistedProviderKind(kind?: unknown): unknown {
    return ((kind === "z.ai-coding-plan") ? "zai-coding-plan" : kind);
}
