# Complete returned-root sets in local helper source

All new implementation and independent case source remains unrun.

Borrowed source values now retain every possible actual original root, including
helper branches that return text from several parameters. Each callee root maps
to its real caller argument; roots from static literal arguments need no local
owner. Nested borrowed Result/Option conversions, local aliases and return
branches preserve the complete union. Native lifetime emission already joins
the resulting real input roots under the function's actual shared lifetime.

Every local owned String that may back a live view remains protected from moves,
including owners beyond the first root. A borrowed return containing any local
owner refuses even when another branch refers to a valid public input. Local
views may still feed operations that produce owned outputs before their original
owners leave scope. The union is conservative; source choices are not guessed
or constant-folded into a narrower lifetime proof.

The original single root remains as compatibility DATA, while all new checking
uses complete root sets. Whole source/meta reanalysis independently reconstructs
the sets and actual helper argument mapping. No supplied root array grants
ownership. Complete original flow and helper source, ordered native-selected
substitutions and full CST inverses are retained. The source author also refuses
overlapping draft edits before writing; the native source producer retains its
own independent overlap checks.

Independent source cases cover both dynamic branches, helper calls, nested
Result/Option roots, local owned conversion, an escaping or moved second owner,
forged roots, whole native reproduction and actual JS plus independent strict
TS. Handwritten native source supplies a separate shared-lifetime oracle for
gated CI. The earlier multiple-input helper refusal is replaced by positive
cases and the retained local-owner escape refusal.

Outcome-sensitive partial release, recursion/generics/methods, broader loops,
mutation/async domains, namespace/bootstrap, production adoption/parity and every
unfinished requirement remain open. No translator, preparer, installer or test
was run.
