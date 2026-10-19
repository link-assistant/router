# Conditional implementation targets and Copy confinement

This is an **UNRUN source design**, audited against frozen coordinator commit
`62c4ce09c82ce53c39cecba7a978157bf4f12077`. It changes no compiler or consumer.
The verified 156 leaf proves a source-written lexical family; it does not prove
that all expanded implementations have that target. No additional planner token
can replace the missing output proof.

## Actual original boundary

The complete `src/bounded_process.rs` is 7,424 bytes with SHA256
`203b0fe8965f7d006ae4d39371d11795ab613ca1ec7546283697bce7c083c409`.
The original spans below are half-open UTF-16 coordinates retained by the genuine
156 proof. They are not rewritten source or a projected parent crate.

| Original selection | Span | Neutral production evidence |
| --- | --- | --- |
| `#[cfg(not(windows))] struct Owned(std::process::Child);` | 202..257 | unknown cfg; original declaration retained |
| `#[cfg(windows)] struct Owned(Box<dyn process_wrap::std::ChildWrapper>);` | 258..329 | unknown cfg; original declaration retained |
| Complete `impl Drop for Owned` | 1733..2493 | outer impl active; target family only |
| Original impl header | 1733..1752 | no generic binder or transforming attribute |
| Complete impl body, including braces | 1753..2493 | nested cfg/output unresolved |
| `#[cfg(unix)]` in `drop` | 1867..1879 | unknown; its possible-present branch remains |
| `format!("-{}", self.0.id())` | 1957..1984 | genuine owner, argument AST and output closure needed |
| `tracing::debug!("retrying diagnostic launch while executable is open for writing")` | 4206..4288 | sibling function output independently unresolved |
| `#[cfg(test)] mod tests` prefix | 5297..5319 | inactive only under the original explicit `test:false` evidence |

156's completed whole-file test is a genuine **standalone file** source view.
Its `['crate','Owned']` family is not the full-library
`['crate','bounded_process','Owned']` family. A future library consumer must reissue
the proof in the actual complete module/view/path/profile and ancestor context.
It must not reuse the standalone proof or turn Windows into an implicit Unix
predicate. The original stdio imports, inherent methods, Drop body and siblings
remain in the input.

Neither Owned alternative derives Copy. Resolving either field layout is not a
substitute for output confinement, and is not required merely to compare a
proved outer family against an unrelated family. Availability and layouts remain
unselected. Both actual async-trait target obligations remain separate too.

## Why a consumer cannot safely run yet

`project-copy.mjs` builds written module-level implementation candidates and
separately appends `originalNestedImplementationObligations` markers. The latter
detects **written** block-scoped impl tokens; it does not expand macros. The
certification loop in `impl-resolver.mjs` can exclude a different canonical
nominal target, but it must not infer that an excluded impl body cannot emit an
additional globally coherent impl.

Current derive provenance checks the candidate owner's relevant ancestor type
and attribute namespaces. It is not a complete global written-bang output proof.
An unknown external macro in a different impl body can expand to
`impl Drop for crate::Payload` without a written `impl` token in that caller.
The current unresolved outer target cannot be replaced by a different-family
row unless these independent output obligations remain mandatory.

The actual Owned body requires `format!` output closure. Its module also requires
the independent tracing output closure above. A per-alternative declaration or
derive planner would add no missing fact: the original alternatives already have
complete source evidence and no derives. This batch therefore adds no fake
consumer or redundant public metadata certificate.

## Ordered language-rule prerequisites

1. **Reissue exact target alternatives.** Consume
   `conditionalNominalTargetFacts` and `conditionalNominalTargetOriginals` with
   the exact original implementation, modules, source scopes and caller. Keep
   every original cfg branch, local import/alias possibility, source view and
   ancestor transformation obligation. Unknown owners or changed profiles refuse.
2. **Observe the complete original body and sibling outputs.** Join each active
   or unknown-present original macro occurrence to its private caller AST and
   full original input. Reuse the lexical nested-impl census as an additional
   obligation, never as evidence that macro output contains no impls. Retain
   every cfg node, attribute, closure, initializer and runtime-dead branch.
3. **Close original dependency ownership (155 B2).** Resolve actual `format!`
   and tracing definitions through complete licensed source, original imports,
   Cargo/profile selection and definition-site hygiene. The original tracing
   chain includes event/callsite/metadata/fieldset/valueset and feature-sensitive
   log branches. A checksum, familiar name or selected convenient branch cannot
   establish these routes. All genuine recursive child occurrences need exact
   parent/path/group associations.
4. **Execute complete builtin output construction (155 B3).** `format!` reaches
   the separately registered `format_args!` callback. Existing
   `format-registered-inputs.mjs`, `format-constructor-inputs.mjs` and
   `format-argument-construction.mjs` retain original recipes/control plans;
   they do not establish execution of the complete original callback. Required
   source includes Rust 1.89 `rustc_builtin_macros/src/format.rs` parse_args and
   make_format_args, the parser/visitor/build helpers, and
   `rustc_expand/src/base.rs` make_MacEager/MacResult adapters. All result slots,
   genuine derived Default construction, argument ASTs and error/retry branches
   must be covered. In particular, the real explicit `self.0.id()` argument is
   not a direct-literal-only constructor candidate. No handwritten expression
   result or assertion that the other slots are empty is allowed.
5. **Only then consume an output-confinement token.** A separately reviewed
   consumer may exclude the original outer impl from an unrelated nominal
   candidate after exact canonical family comparison. It must continue checking
   every nested/global impl, macro/attribute output and sibling obligation.
   Matching Owned, unknown aliases, unresolved conditional targets and every
   unknown additional output refuse. The two async-trait impls remain unproved
   until their own full transformation/output contracts close.

158's proposed local-use/static grammar is an additive B1 syntax prerequisite.
It is not B2/B3, a caller-owner token, or a no-Drop proof. The registered format
constructor profile is `c499a8b3871286c18ec6ce5db7d49895ff00df2fce462baeb97f865391c849f0`;
the complete tracing input profile is
`48935381835144339e12d9046bda6c52945eee6a4662eacbf2c55face1e1e29f`.
Existing complete archives and licenses suffice for this design; none were
downloaded, replaced or duplicated here.

## Ordered repository verification rules

First use complete focused Node and Bun files with the original finite case and
child limits. Retain full source, checked output, private-source reissue inputs,
JavaScript, strict TypeScript 5.9.3 and every failure. Do not run local Rust.
Only after those generic output and consumer controls pass should one complete
unchanged Router root graph check actual bodies in both JS and strict TS.

Required controls include an unequal outer target with a nested written Drop;
an external nested macro that may emit Drop/Copy for another family; a hidden
impl in a static initializer/closure/dead branch; a conditional target alias;
unknown cfg_attr/procedural transforms; copied/foreign output tokens; unknown
macro owners and extra/missing recursive children. Matching Owned must remain
unavailable for Copy, including either explicit platform profile. A false cfg
may remove a branch only through original private selection evidence. All
source checks must use the entire original file and actual parent graph.

The historical 78-method refusal cohort is an investigation target, not a gain
prediction. This design removes no diagnostics and adds **zero body gains**.
