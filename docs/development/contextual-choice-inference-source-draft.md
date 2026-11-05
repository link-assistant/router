# Contextual default-sized scalar choices

Source draft only; all implementation and independent cases remain UNRUN.
Full requirements, translation and every qualification obligation remain OPEN.

The copied contextual inference engine extends the earlier wide-choice rules to
common default-sized choices such as `flag ? 0n : 1n`. A private current handle
associates the actual initializer with its original immutable aliases and uses.
The initializer remains a let and is evaluated once. Without a precise typed
use, the original default scalar behavior stays unchanged. A written/native
domain, actual typed helper operand, precise comparison operand or vector use
can promote that local into the shared finite scalar constraint solver.
The copied raw integer bitwise reader uses the same current operand join before
all of its original exact-domain checks; the old reader keeps its contract.

Each promoted local is monomorphic. Its aliases cannot demand conflicting
widths, and its literals must fit the complete actual domain. A default signed
choice is not itself a typed anchor for another unresolved variable. Literal
values and literal-only choices constrain possible widths without granting one;
the final walk refuses every unanchored private variable. Candidates and
references are private to the current function, retain the 64-local and existing
shared work/depth/variable bounds, and create no across-operation cache.

A separate complete source-history copy defers comparison/copy domain records
until function-local inference finishes. It then applies the entire original
source-span, operand, exact-domain, count and byte checks to the current live IR.
Pending references clear at finalization, which runs exactly once. Earlier
metadata cannot retain a provisional i64 domain after genuine typed uses resolve
the same local to i8. The old immediate history and all prior inference APIs
remain unchanged. Neither history nor a candidate handle issues source, type,
namespace or executable authority; complete private receiving/native checks
still decide admission.

Four complete source equations preserve frozen whole originals, lossless
CST/meta serialization/reparse, full inverse substitutions and exactly language
then repository sequences. Independent unrun cases cover all ten exact widths,
signed choices, immutable aliases, helper operands, scalar return joins,
default-result preservation, JavaScript/JSDoc, absent/conflicting anchors,
foreign/copied handles, original APIs and final versus immediate history.
Independent Rust oracle source remains reserved for fatal CI after all eight
same-SHA JavaScript stages pass. No parser, compiler, preparer, translator or
case was run locally. CI feedback remains uninspected while drafting.

General arithmetic inference, aggregate inputs/borrows/mutation/iteration,
cross-module helpers, actual native producer closure and the full requirement
draft remain OPEN. Compiler/export receiving, profiles, performance, canonical
and reverse freshness, parity and CI qualification also remain OPEN.
