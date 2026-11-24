The draft Rust translator checks primitive integer literal ranges in source
patterns and proves match coverage with bounded interval unions. Inclusive and
exclusive endpoints retain their actual Rust signedness, suffix, domain and
source spans. Guards never provide coverage, and overlapping arms retain source
order with one evaluation of the subject. Unguarded exhaustive integer matches
lower to ordinary checked let/if/binary IR, preserving existing const admission
and concrete selected-path evaluation rules.

The authored tests pin the unchanged logging::http_failure declaration and the
ThinkingLevel::from_budget method with its complete original enum attributes.
The Thinking test selects declarations mechanically and uses the existing sealed
derive dependency profile; it does not certify the macro-blocked whole file.
Additional tests exercise signed minima, u128 interval coverage without value
enumeration, gaps, guarded overlaps, effect order, suffix identity, strict TS,
and explicit refusals. Nonliteral/open endpoints, custom/ref/float/char domains,
nested aggregate range matches and guarded const matches remain unsupported.

The draft began on integrated 7e25187c90f5201fc529c528ab98037d4a184d7c.
The initial 14-file scope passed 103/105 cases in both Node and Bun: the new
out-of-domain assertion expected TypeError instead of the existing RangeError,
and that preserved baseline still had the nested-Option refusal already repaired
in the published current cohort. Both failure logs are retained.

Final verification starts from published 7bfc51aa447c8929f7b88540986b18f50554ef3d
plus this range feature and the exact RangeError assertion correction. All 106
cases in the same 14 files pass in Node (36.271s) and Bun (39.88s), including
unchanged JavaScript, separately strict-compiled TypeScript, original source
pins, constant evaluation and ownership refusals. The other 15 unsupported
pattern inputs remain intact. No generated artifacts, original Rust bodies,
dependency packages or runtime parity claims are changed.
