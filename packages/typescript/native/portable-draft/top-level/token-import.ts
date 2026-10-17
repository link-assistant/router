// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from packages/javascript/native/token-import.mjs; source sha256=db94e3f88df72216c3492c331c7e9b369ce4d1cfd4b8894c1c19be5e867cf8f5; IR sha256=4eab8dfdddb4ce22b53438f2dd65cde89ad9cf3e29f148d24a0026462a13d371.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function fail(message: string): Error & { "code": string; "exitCode": number } {
    return Object.assign(new Error(message), {"code": "token_import", "exitCode": 2});
}
