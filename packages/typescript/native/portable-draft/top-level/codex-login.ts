// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from packages/javascript/native/codex-login.mjs; source sha256=3a5895c1a4c40fb93a7775bf887128fd38348f2f05406878f79266b25ca2b86d; IR sha256=efb1987e23b970da1166b1817b0280a2f497419bd679ca98526cbe58109989ab.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function fail(code: unknown, message: string, status: unknown = 400): Error & { "code": unknown; "status": unknown } {
    return Object.assign(new Error(message), {"code": code, "status": status});
}

function nonempty(value?: unknown): boolean {
    return (((typeof value) === "string") && (value.trim().length > 0));
}
