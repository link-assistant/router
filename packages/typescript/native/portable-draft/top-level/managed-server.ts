// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from packages/javascript/native/managed-server.mjs; source sha256=e75adfc79b0ef607e789f98f996f69580e0ecde3ea9fd80ceae10df1d79c3bdf; IR sha256=cfc83b940a258c11b70689594946bbb037f559d01c3d462d3eeac528675bea2c.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
const ENGINE: string = "link-assistant-router/native-managed/v1";

const MAX_STATE: number = (1024 * 1024);

function fail(message: string): Error & { "code": string } {
    return Object.assign(new Error(message), {"code": "managed_server"});
}

function unsupported(message: string): Error & { "code": string } {
    return Object.assign(new Error(message), {"code": "unsupported"});
}

function out(...lines: unknown[]): { "output": unknown[] } {
    return ({"output": lines});
}
