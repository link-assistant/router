// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from packages/javascript/native/emergency-auth.mjs; source sha256=cf0f05c7cc52e209f0f6408b07b4665747cc5b71432755b341c0be5ad2177cc9; IR sha256=58bdcdbf6d44f7d598e0054648337a1746d06c043895c670a4a4c42aa653a756.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function failure(message: string): Error & { "code": string; "status": number } {
    return Object.assign(new Error(message), {"code": "invalid_emergency_config", "status": 400});
}

const clientNames: ReadonlySet<unknown> = new Set<unknown>(["claude", "codex", "cursor", "gemini", "grok", "opencode", "qwen", "agent"]);

export function isSyntheticTokenId(id?: unknown): boolean {
    return (((typeof id) === "string") && id.startsWith("emergency-bypass-"));
}
