# Source-copy import closure during bulk drafting

When cloning a complete compiler lane, rename only declarations and references
whose implementation was actually copied. An external module must keep its
original exported binding, optionally under an explicit local alias, or receive
a complete implementation copy with matching exports. Renaming a binding while
retaining the old import path produces an unresolved export before the compiler
can run. Source-only review must inspect these edges before committing.

For issue759, keep the drafting prohibition intact: do not execute import probes,
parsers, tests or translator experiments to discover these errors. Read the
complete consumer import and producer exports, preserve both original images,
and draft whole source/history cases. After the full source draft and execution
authorization, run original complete Node/Bun and strict TS obligations.

The scalar inverse source at3a96f9fe8 renamed its context binding but retained the
older literal-context path. A source-read review found the mismatch. The explicit
successor adds the complete scalar-context helper and whole six-case file,
changes the inverse import to that copied module, and retains both full old/new
inverse images. The original archive and its source-author image remain intact.
The new source visitor verifies both archive generations, current full sources,
all original/current context/case bytes and transitive parent case closure.
This records a source-draft correction; it is not a failed executed test or CI
repair, since no such execution or feedback was inspected.

Current successor archive SHA256:
`127fb1a5a57d9692aa97e3315cb0e0f89d0ee570904f45cdbe60ec0aadb9a5cc`
(290,541 decoded/42,963 packed bytes). It adds two complete context/case copies
and one full inverse-import evolution to the original eight-copy/one-addition/
two-native cohort, with four current whole case files. All code/cases remain
UNRUN. Matching import spellings are necessary packaging evidence; they grant
no source/type/ownership/executable authority or complete translation coverage.
