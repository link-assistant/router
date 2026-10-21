// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/provider-manifest.mjs; source sha256=e2202d46ff724740d8250ecfad06df4c980b658aa2162f89143cd72caa4fca5e; IR sha256=0d48a776b6bdfef074fde42b3ab4e54e0c9ee5dfec04a6507f88d2a8e66307dd.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function fail(message: string): Error & { "code": string; "exitCode": number } {
    return Object.assign(new Error(message), {"code": "provider_import", "exitCode": 2});
}

const fields: ReadonlySet<unknown> = new Set<unknown>(["name", "kind", "base_url", "default_model", "models", "supported_clients", "api_key", "api_key_env", "encrypted_api_key", "enabled", "subscriber_id", "acknowledge_intermediary_risk", "acknowledge_unsupported_clients", "if_absent"]);
