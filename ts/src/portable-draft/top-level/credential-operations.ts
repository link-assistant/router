// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/credential-operations.mjs; source sha256=dae49bf6f618971b6df1c63b00e3541892cd95fbedb78422a7b28ff3170e1e66; IR sha256=12453ba9e6663199293b87c6aeb86f4fb51a7a50d6116398b4cfbfad67f2cd77.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function fail(code: unknown, message: string, exitCode: unknown = 1): Error & { "code": unknown; "exitCode": unknown } {
    return Object.assign(new Error(message), {"code": code, "exitCode": exitCode});
}

function output(lines?: unknown): { "output": unknown } {
    return ({"output": lines});
}
