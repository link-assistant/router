// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked scoped bodies from js/src/github-proxy.mjs; source sha256=3e4fbfa5c8eb7ac8140beb47c150726e774e620a1334eb7a4e3c45f7dc838db8; IR sha256=17b29a97db1172182b0bb2fe2828a784a7d511b3f3d24b74cfa9361d976d7532.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function scopedSrce7285cceffb702d4At1761(name?: unknown): boolean {
    return (["transferrepository", "updaterepositoryruleset", "createrepositoryruleset", "updateorganizationruleset", "createorganizationruleset", "updatebranchprotectionrule", "createbranchprotectionrule"] as readonly unknown[]).includes(name);
}

function scopedSrce7285cceffb702d4At2097(name?: unknown): boolean {
    return (["updateref", "updaterefs"] as readonly unknown[]).includes(name);
}

function scopedSrce7285cceffb702d4At2207(key?: unknown, v?: unknown): boolean {
    return ((key === "force") && (v === true));
}

function scopedSrce7285cceffb702d4At2346(key?: unknown, v?: unknown): boolean {
    return (((key === "afteroid") && ((typeof v) === "string")) && /^[\u0030]{40,}$/.test(v));
}

function scopedSrce7285cceffb702d4At3721(key?: unknown): boolean {
    return (key !== "rules");
}

function scopedSrce7285cceffb702d4At3929(key?: unknown): boolean {
    return (!(["effect", "method", "path", "body_contains"] as readonly unknown[]).includes(key));
}
