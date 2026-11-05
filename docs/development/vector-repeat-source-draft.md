# Bounded owned vector repetition source draft

SOURCE ONLY. No parser, preparer, translator, test, compiler or experiment ran.
CI feedback remains uninspected. Source drafting continues with all requirements
and qualification obligations OPEN.

Qualified owned vec repetitions now use the existing native repeat parser/type
checker and its original 4096-element bound. Language rules retain the complete
operand/count source. Repository rules bind the genuine paired facade and the
existing privately checked owned-vector projection. The scalar operand is
checked and evaluated once, including zero count, before allocating the result.
The result carries actual owned Vec storage rather than sized-array storage.
Normal whole-function type, lifetime, namespace and checked-meta checks remain.

The initial domain is checked Copy integers and bools. Counts must be written
usize-compatible integer literals, including hexadecimal forms. Dynamic or
compound counts, text cloning, borrowed text, nested arrays, custom Clone,
nominal elements and nonlocal seed control remain refused. No framework or
standard-library internals are translated or relabelled as executable code.

The explicit reverse vector candidate now reads native AST scalar const bindings
and zero-argument block IIFEs ending in dense literal/alias arrays. It checks every
seed even when output is empty, resolves each alias to its actual unique native
symbol and retains the original Rust scalar width/signedness. Calls, mutation,
spread, sparse arrays, async closures, dynamic counts and unchecked intrinsics
remain refused. Complete JS/TS pairing, fresh actual Rust forward capture and
private meta reissuance remain mandatory. The existing reverse emitter can
normalize a pure repeated list to a comma list; exact original text is retained
separately as CST source data. General effectful forward output and parameterized
reverse callers still require additional source rules.

Six complete compiler source equations retain both ordered language/repository
phases, physical originals and complete CST inverses. Independent unrun cases
cover twelve integer domains/bool, count-zero evaluation, seed panic timing,
actual source adoption/trivia, unsupported storage and cloning, reverse const/
IIFE/alias construction, integer bounds on unused seeds, private meta roundtrip,
emitted JS/strict TS, export closure and native Rust oracle source. Fresh outputs,
full-source sync/reverse, all production callers, receiving qualification and
all eight same-SHA JavaScript gates followed by Rust CI remain OPEN.
