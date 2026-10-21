// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked scoped bodies from js/src/client-status.mjs; source sha256=cfd6afd52b809baa8478dd1df89a34e44dcf1f12529c76cc6b73f85bd0da2c84; IR sha256=2ea5847202ce191e68be66f4c3b48e4737560d828fd5d6aac727facfb152747b.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
// Source-bound body draft; parent creation/effects remain refused; runtimeParity: false.
// Conditional private body draft: original standard collection intrinsics required.
// Original has/includes lookup stability and parent execution are unproved.
function scopedSrc8fb263f4ccf34de5At2581(): (key?: unknown) => boolean {
    return (key?: unknown): boolean => {
        return (!((observed: unknown) => observed === "ANTHROPIC_MODEL" || observed === "ANTHROPIC_DEFAULT_OPUS_MODEL" || observed === "ANTHROPIC_DEFAULT_SONNET_MODEL" || observed === "ANTHROPIC_DEFAULT_HAIKU_MODEL" || observed === "CLAUDE_CODE_SUBAGENT_MODEL")(key));
    };
}

function scopedSrc1e0923ac60ac7f44At3464(key?: unknown): boolean {
    return (!(["ANTHROPIC_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL"] as readonly unknown[]).includes(key));
}
