# Serialization context metadata reuse

A genuine `captureSerializationContext` owns immutable captured source strings, profile and dependency evidence behind its private context identity. Extraction can reuse unbranded data layout metadata for that exact context, ordered roots and direction. Copied contexts and roots with proxies, getters, holes, inherited array prototypes or incidental properties refuse before lookup. Root data is copied into an immutable snapshot before keying.

Each extraction returns a fresh deeply frozen clone. A cached extraction never reuses a parsed metadata identity: canonical serialize/parse comparison remains mandatory, and only the existing parser grants checked metadata authority. The cache keeps at most 128 entries and 16 MiB of metadata per context. It retains no parser, mutable namespace registry, checker, loan state or semantic program.

Metadata containing a default-body proof remains uncached. Repeated extraction continues through the actual Host parser and checker, including their live prototype and source ownership guards. Contexts newly captured after source, namespace or profile changes receive independent metadata. An existing captured context continues to describe its original immutable source snapshot.

The Rust structural scanner checks the exact raw-literal prefix and existing preceding UTF-16 code-unit boundary before taking a source suffix. It assembles ordered, nonoverlapping masks in one pass. The original pinned item lexer, source-bearing token text, offsets, errors and mutable result allocations remain the same; comparisons use the unchanged committed scanner on all 804 original Rust files and every locked derive member. This changes no source admissions or proof issuance.

A genuine builtin compiler-source profile also reuses the frozen original macro syntax for each issuer-owned source path. Every reuse joins the exact retained source object, string and hash. Profiles share no syntax cache. Recipe selectors and uniqueness checks still traverse the original syntax; fresh definitions and existing privately issued function fragments retain their original identity rules and exact serialize/parse comparisons. No checked computation, parser, default-body proof or source namespace plan is cached.

Locked Clap sources retain immutable declaration names/spans and significant scalar syntax only within their genuine private dependency issuer and exact original source identity, string and hash. Predicates still run for every matching declaration in the original order, including effects, thrown errors and reentrant queries. Rule pattern scans and returned evidence allocations remain fresh. Nothing is shared across dependency identities.

Independent primitive vectors, original DTOs and source graph stages have separate tests with the existing five-second or sixty-second limits. Complete original graphs, original spans, private owner proofs, residual source owners and current binding checks remain covered. The first complete bulk call is measured with a cold context; no warm-only result substitutes for that check.

This is bounded layout metadata reuse. Generated trait execution, full source and runtime parity remain unproved.
