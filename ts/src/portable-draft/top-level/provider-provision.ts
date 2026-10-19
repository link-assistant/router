// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/provider-provision.mjs; source sha256=dd01336f186b8f4ef40b8584c4ff64aa07dc4f090f678a59c9d0a601b9c7bdb9; IR sha256=2d30fc7ce0cb111155e78a47c1d5d51b7d1855e297e6fe2b8348b919c3e2edbe.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function failure(outcome: unknown, message: string): Error & { "code": string; "outcome": unknown; "exitCode": number } {
    return Object.assign(new Error(message), {"code": "provider_acceptance", "outcome": outcome, "exitCode": 1});
}
