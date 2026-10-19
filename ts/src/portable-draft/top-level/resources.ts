// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/resources.mjs; source sha256=bba4751a4e639261a9036aa1c62510701d1e76fc07fe7a7661613fecd73e140c; IR sha256=87eefac01a23e0c4d503b6b94406bbdd7d426f5cc059a4e970adefa92757f682.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
const MAX_BYTES: number = ((256 * 1024) * 1024);

const MAX_FILES: number = 10000;

const MAX_DEPTH: number = 128;

function unsupported(message: string): Error & { "code": string } {
    return Object.assign(new Error(message), {"code": "unsupported"});
}

function bad(message: string): Error & { "code": string } {
    return Object.assign(new Error(message), {"code": "invalid_resource"});
}
