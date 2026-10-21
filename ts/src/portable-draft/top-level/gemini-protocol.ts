// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/gemini-protocol.mjs; source sha256=0c15dfd433d8a354b5c66a6c88d9edc66db1796b56e1aa46e8045756632626e9; IR sha256=554904678c3155503bf7a2e3df4f0f3384471c7c70ef48087a988579b7482f97.
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
