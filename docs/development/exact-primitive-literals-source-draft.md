# Exact primitive literal spelling source draft

All implementation and cases UNRUN. Full requirement drafting and complete
translation remain OPEN. No local tests, compiler or translator ran.

The existing literal constructor is copied into an additive exact-domain API.
A genuine fixed primitive domain must already be supplied by the independent
source checker. It accepts at most 130 stripped spelling characters, allowing
128-bit binary literals with their prefix, and bounds original raw text to 1024
characters. Exact signed/unsigned range checks and canonical decimal IR values
remain unchanged. Nonliteral operands are never recast, and literal magnitude
never selects a native width. This DATA constructor grants no lexical/source
permission: actual complete source syntax and imported type binding remain
independently checked before it is called.

A separate dispatch API preserves the original constructor for absent domains
and chooses the additive constructor for an explicit fixed domain. Original
public APIs, default u64/i64 limits, malformed-source refusals and their original
66-character bound stay unchanged. Eight actual source consumers select that
dispatch: core, iteration, collections, vector candidate/inference, state,
outcome and cancellation. This changes only exact-domain literal preparation;
no broader family domain, source ownership or runtime permission is inferred.

Ten complete source equations retain whole original sources, lossless CST/meta
serialization/reparse, inverses and language then repository phases. Draft cases
cover all ten widths, signed extrema, binary/octal/hex spellings, old API/default
refusals, overflows, wrong signs, invalid/oversized text, complete receiving-first
source insertion and an exact u128 checked operation operand. Independent Rust
literal oracles use native MIN/MAX constants and run only in gated CI later.
All strict parity, freshness, receiving export, platform, performance and CI
obligations remain OPEN; CI feedback stays uninspected during drafting.
