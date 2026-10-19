// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from packages/javascript/native/gemini-protocol.mjs; source sha256=0c15dfd433d8a354b5c66a6c88d9edc66db1796b56e1aa46e8045756632626e9; IR sha256=b5027a564e31f3d6fcec344f75bf0d74044aeff723dc61d1dc7eb35322230e66.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
import { ProtocolError as routerOriginalError0 } from "../../protocols.js";

// Conditional original constructor body: unchanged constructor, Error, inherited prototypes and standard intrinsics required.
// TypeScript imports the actual original class; Rust Result retains only a fresh UTF16/own-field projection.
// Outside-module prototype closure and runtimeParity are unproved.
function imageMedia(value?: unknown): unknown {
    if ((!(["image/jpeg", "image/png", "image/gif", "image/webp"] as readonly unknown[]).includes(value))) {
        throw new routerOriginalError0("Image media type is unsupported");
    }
    return value;
}
