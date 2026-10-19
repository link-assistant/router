// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/operation-input.mjs; source sha256=9a847b5efee84ca21f47afda2b2374f082892a4f8dd39bca7a1d58524f46f57e; IR sha256=4b1282c9f69540b24df6893a0d207a86e56670ee70d066389bb7d2a501d30105.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function fail(message: string): Error & { "code": string; "exitCode": number } {
    return Object.assign(new Error(message), {"code": "operation_input", "exitCode": 2});
}
