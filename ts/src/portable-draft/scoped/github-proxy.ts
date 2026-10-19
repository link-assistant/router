// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked scoped bodies from packages/javascript/native/github-proxy.mjs; source sha256=3e4fbfa5c8eb7ac8140beb47c150726e774e620a1334eb7a4e3c45f7dc838db8; IR sha256=be72172536d67b0238055a2cb46ffbd99a1046c8bcd039567398baeab2d48004.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function scopedSrc38db8cde9674d040At1761(name?: unknown): boolean {
    return (["transferrepository", "updaterepositoryruleset", "createrepositoryruleset", "updateorganizationruleset", "createorganizationruleset", "updatebranchprotectionrule", "createbranchprotectionrule"] as readonly unknown[]).includes(name);
}

function scopedSrc38db8cde9674d040At2097(name?: unknown): boolean {
    return (["updateref", "updaterefs"] as readonly unknown[]).includes(name);
}

function scopedSrc38db8cde9674d040At2207(key?: unknown, v?: unknown): boolean {
    return ((key === "force") && (v === true));
}

function scopedSrc38db8cde9674d040At2346(key?: unknown, v?: unknown): boolean {
    return (((key === "afteroid") && ((typeof v) === "string")) && /^[\u0030]{40,}$/.test(v));
}

function scopedSrc38db8cde9674d040At3721(key?: unknown): boolean {
    return (key !== "rules");
}

function scopedSrc38db8cde9674d040At3929(key?: unknown): boolean {
    return (!(["effect", "method", "path", "body_contains"] as readonly unknown[]).includes(key));
}
