# Checked source text concatenation draft

All implementation and independent cases/oracles are SOURCE only and UNRUN.
No local tests, compilation, compiler/preparer/translator execution or CI feedback
inspection occurred. Complete translation and synchronization remain unfinished.

The full resource reverse lane accepts binary plus only after independently
checking both operands as real borrowed/owned primitive text. It preserves left
then right evaluation, borrows existing owners and produces fresh owned text with
no escaping root. Mixed numeric/object/null coercions remain refused. Explicit
primitive String conversions retain their existing closed argument checks.

The matching canonical native form is exact core format!("{}{}", left, right).
Only independently checked primitive display conversions can be folded into its
arguments; their conversion is pure and actual argument expressions keep order.
Native projection preserves fixed-width literal identity and proposes explicit
String calls. Original fresh whole JS/meta/Rust reproduction, source associations,
two CST sequences and complete inverses remain mandatory. Arbitrary templates,
format options and different slot counts retain their existing refusals.

The checked forward emitter also preserves String(...) for zero-slot owned text
format literals, avoiding loss of the owned result witness. No vendor API, native
runtime ABI, private owner issuer or eight-stage JS-before-Rust gate is changed.

Five complete compiler equations and independent unrun eight-caller paired
JS/strict TS/native inverses, four real forward formatter callers, source/meta/
coercion/refusal, native order/owner oracle and export source are drafted. Full
generated-module/native guard qualification and all remaining namespace,
production/reverse/sync/parity/freshness/receiving/delivery rows remain OPEN.
No cross-operation source/hash/owner/verdict/result cache is added.
