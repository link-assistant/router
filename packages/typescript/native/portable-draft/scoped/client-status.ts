// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked scoped bodies from packages/javascript/native/client-status.mjs; source sha256=cfd6afd52b809baa8478dd1df89a34e44dcf1f12529c76cc6b73f85bd0da2c84; IR sha256=b0ea219acf85b6b5e2301ad64974b5d8bf111a895a1c6c14b1b5411f1ce5cf65.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
// Source-bound body draft; parent creation/effects remain refused; runtimeParity: false.
// Conditional private body draft: original standard collection intrinsics required.
// Original has/includes lookup stability and parent execution are unproved.
function scopedSrc0cef2b40b0bcdecdAt2581(): (key?: unknown) => boolean {
    return (key?: unknown): boolean => {
        return (!((observed: unknown) => observed === "ANTHROPIC_MODEL" || observed === "ANTHROPIC_DEFAULT_OPUS_MODEL" || observed === "ANTHROPIC_DEFAULT_SONNET_MODEL" || observed === "ANTHROPIC_DEFAULT_HAIKU_MODEL" || observed === "CLAUDE_CODE_SUBAGENT_MODEL")(key));
    };
}

function scopedSrc68a7fd82a94bce8eAt3464(key?: unknown): boolean {
    return (!(["ANTHROPIC_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL"] as readonly unknown[]).includes(key));
}
