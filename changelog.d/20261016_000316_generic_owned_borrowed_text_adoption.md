Add a reusable lossless CST proposal tool for adopting the owned borrowed-text
interface in function signatures and constant type annotations, independently
of whether a function formats text. It structurally visits complete declarations,
including bounded type arguments, tuples, arrays and simple inherent impls;
macro templates, function bodies and ordinary field declarations stay unchanged.
Every proposal keeps complete original/reconstructed source, canonical CST,
ordered language/repository substitutions, typed selections, skip reasons and a
full source inverse. The corpus API resolves its own original module graph and
can consume formatting-proposal files without trusting public proof flags.

The tool retains unknown producer, competing type/import, configuration, module
alias, unsupported binder and type-grammar boundaries. In particular, the complete
token module's unknown serde derive effects still block its type adoption. A
separate closed fixture uses the complete original token-prefix constants and
callback body to check matching behavior; this does not claim that the whole
module becomes executable. Newly reconstructed source must pass the existing
owned-facade, lifetime, checked-meta and independent target checks. No implicit
standard-prelude ownership or application coverage is inferred from a rewrite.

Eight complete new cases retain full sources and outcomes with 60-second limits
and 20-second strict TypeScript children. This is a SOURCE-ONLY draft: JavaScript,
Bun and strict TypeScript are UNRUN here. Native oracle source from batch 312 stays
CI-only after the full JavaScript gate for the same revision. No generated
application output or Rust source migration has been installed by this draft.

Source review V2 explicitly excludes trait/unsupported impl headers before method
traversal, censuses extern-crate type aliases (including Router's unchanged self
alias), and keeps unknown foreign or header-less declaration producers as scope
uncertainty. These controls extend the existing eight cases without changing
workloads or deadlines; runtime checks remain UNRUN.
