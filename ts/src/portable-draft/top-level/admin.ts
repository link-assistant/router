// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/admin.mjs; source sha256=07419bb36f9df147782ca321daa5ffb4b376c6b02be89131ee2222534866d18d; IR sha256=3e55eced4ecefa30504303a5eee4cd0c5acdf6cc89ac875e2b17152df2e5fcc3.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function ttl(hours?: unknown): number {
    return ((Number.isSafeInteger(hours) && ((hours as number) > 0)) ? Math.min((hours as number), 8760) : 8760);
}
