# Paired owned text copy source draft

All new implementation and independent cases are UNRUN. Only source construction
and review occurred. No runtime, selector, translator, preparer, test, experiment,
generation, local Rust tool or CI-triggering push executed.

One paired to_owned contract copies a bounded str into native owned String
storage. Its primitive immutable JavaScript value ABI retains the same scalar
content, validates the original 1 MiB domain and exposes no mutable storage or
pointer operations. The shared catalogue drives both translation directions,
ownership result type, runtime import, declarations, source checks and checked
interpreters. The result is owned rather than borrowed from the input.

The complete text selector maps zero-argument to_owned and text to_string on
known str/owned String receivers to that contract. clone maps only for an already
tracked owned String; borrowed reference clones keep their original domain.
Actual string literal receivers can now be selected without a text parameter.
Byte/C string prefixes, characters, numeric/custom Display, mutation, shadowed
aliases, unknown source producers and unsupported arguments remain refused.
Full original source/CST inverses and fresh whole-function ownership/semantic
checks still govern installation; original trait/Drop proof stays unqualified.

The native append transaction copies the complete existing two-phase constructor
and retains adjacent SHA256/ASCII/fallback/native stages, complete originals and
all inverses. Twelve compiler equations preserve full original modules, native
owner spans, separate ordered language/repository substitutions and CST/meta
boundaries. Generated targets are not manually edited.

Independent unrun cases cover native owned storage independence, Unicode/NUL/
CRLF, primitive/bound refusal, literal-only callers, known text display and owned
clones, JS/strict TS, checked reverse interpretation, typed/Rust inverses and
changed source refusal. Current source-bank/export freshness, real production
adoption, original-source/runtime parity, whole reverse synchronization, CI and
receiving qualification remain unfinished.
