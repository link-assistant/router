# Reverse read-only JSON domain source draft

Every new implementation and independent case is UNRUN. Source construction and
review executed no reverse compiler, runtime, preparer, tests, experiments,
generation, Rust tool or CI-triggering push.

The existing finite reverse reader table now includes the five existing runtime
operations for binary64, unit, number, array and object reads. Together with the
original eight entries this covers all nine read-only as_* readers plus the
original get/pointer/null-predicate operations. Their complete checked runtime,
declaration, native/Cargo context, original import symbols and source custody
requirements remain unchanged.

Matching optional payload, native Rust and strict TypeScript mappings preserve
unit as null, scalar f64 as number, and borrowed Number/Vec/Map results as
references to the original input root. Existing source checking reconstructs
actual calls and dominating Some branches; direct and rewrapped carriers retain
the same projection. Public optional inputs continue to fail before any target
or carrier read without their separate checked boundary. This draft adds no
generic numeric/null literal creation, direct scalar return relaxation or
arbitrary collection mutation.

Two whole compiler equations retain complete original modules, native variable/
function owner spans, separately ordered language/repository substitutions,
serialized/reparsed CSTs and full inverses. No runtime, native library or
generated output is hand-edited.

Independent unrun cases compare original JS, original strict-compiled TS, emitted
strict-compiled TS and the checked interpreter, with missing/wrong/null/empty/
Unicode/aggregate values, input-root identity, unit, negative zero and integer to
binary64 rounding. The actual repository TypeScript compiler version is recorded.
Native CI-only oracle source covers the corresponding borrowed and scalar cases.
Whole production reverse admission, original equivalence, source-bank/export
freshness, complete synchronization/parity, all eight JavaScript stages, gated
Rust CI and receiving qualification remain unfinished with every bulk requirement.
