// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/usage.mjs; source sha256=92485873de1ea2c4e4e05dddea2250e3668f5e2fdb9ec61f083962572ddf7274; IR sha256=0545a55ab49adcfa6425778dd5bd5cec06bf4566cd24707cf823c106aaa1da62.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function integer(value?: unknown): number | undefined {
    return ((Number.isSafeInteger(value) && ((value as number) >= 0)) ? (value as number) : undefined);
}

function chars(value?: unknown): number {
    return (((typeof value) === "string") ? [...value].length : 0);
}
