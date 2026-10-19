// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/remote-operations.mjs; source sha256=877e0c4d821ab90eadf1119b221b9f7c58eaf93d2500ecd7c6f736ce350c9ce9; IR sha256=4a6a1a8d5a7688eeeb174a73e394a9233effa195ec88839c010fd618e4d5ba11.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function error(message: string, exitCode: unknown = 1): Error & { "code": string; "exitCode": unknown } {
    return Object.assign(new Error(message), {"code": "remote-operation", "exitCode": exitCode});
}

function out(...output: unknown[]): { "output": unknown[] } {
    return ({"output": output});
}

function nullish(value?: unknown): unknown {
    return ((value === undefined) ? null : value);
}
