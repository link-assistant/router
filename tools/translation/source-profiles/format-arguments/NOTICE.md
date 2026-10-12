Original Rust 1.89 source inputs, fetched from the official rust-lang/rust tag.
All original-byte and gzip SHA-256 values, URLs, reused portable input paths and
licenses are in manifest.json. Six new compressed inputs total32,563 bytes;
four existing standard-library inputs and the pending compiler registration
input are referenced without duplication. Rust's MIT and Apache-2.0 licenses
are reused from ../copy-standard.

The registration input is in Translator's separate, unverified future
builtin-derive-bang profile. If absent, the loader reports a required source
input unavailable and cannot claim complete input or builder ownership. No
optional skipped validation grants authority.

These inputs stage original declarative wrappers, literal/argument token order,
compiler function bodies and call edges. Compiler builtin macro comment bodies
are never run as ordinary transcribers. Syntax/meta observations do not prove
caller macro/alias/builtin-attribute ownership, compiler parser/builder behavior,
formatting traits, allocator/OOM, I/O locking/panics or application/native parity.
