// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from packages/javascript/native/auth-service.mjs; source sha256=39d3f52bcf3e0c28181de027c195f7ab85282bb6ef6e8aa269d215d8a8065c46; IR sha256=2c137a8e20f387812bed131c9498dc76a05ba697a05540331215fb40ca05fdb3.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
function fail(code: unknown, message: string, status: unknown = 400): Error & { "code": unknown; "status": unknown } {
    return Object.assign(new Error(message), {"code": code, "status": status});
}

const pending: ReadonlySet<unknown> = new Set<unknown>(["awaiting_code", "awaiting_callback", "awaiting_device"]);
