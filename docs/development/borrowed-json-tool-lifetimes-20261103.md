# Borrowed JSON lifetimes and whole emitted definitions — source draft

The JSON operation now selects a lifetime-only function binder and delegates
actual binder/name/token/use checking to the original named-lifetime parser.
It does not admit type/const generics, outlives clauses or where predicates.
The type issuer retains the complete original `&'input Value` or
`&'static Value` tokens. Its original source lifetime checker still joins
named references to the actual free-function binder. No local borrow is
rewritten or promoted to `'static`, and this predicate returns no loan.

This closes an identified connection gap: both reverse emitters already produce
`&'a ::serde_json::Value`. The first JSON selection draft refused every `<`
in a function signature, including that real lifetime-only output. Its
receiving test's Rust type assertion now also reflects that original emission.
Source reading established this gap; no compiler experiment was used.

The actual owned-definition exporter now selects this family before its older
JSON definition handlers. It reissues complete actual original/current/lowered
functions through their existing source and private checker machinery. The
new packaging rule exports the actual emitted function by an original native
AST span; it neither reconstructs its body from a template nor deletes input
guards. The actual parameter guard now reaches the JSON shape-guard branch,
which was previously present but bypassed by the ordinary non-data parameter
fallback. Other parameter branches and older definition handlers remain.

Complete JS and annotated TS bodies pass the original paired-source CST and
executable-equivalence preparation. The pair, full original parent/declaration,
actual mapping, source signatures, source edits and whole inverses remain DATA.
Each real reverse compiler must independently inspect actual original imports,
written/paired types, symbols, whole body and complete receiving native tree.
The compiler-source guard accepts a later created-module image only through
the existing exact complete terminal-source history, preserving its original
creation image rather than repinning it.

Independent source-only receiving cases draft all four input lifetime forms,
invalid binders and actual emitted Rust→JS/TS→Rust→JS/TS paths through both
original reverse compilers. They keep the entire original project module graph
and explicit complete root source substitutions for virtual receiving modules.
The source Rust oracle includes the complete actual application module and
compares named/static/scoped borrowed observations without returning a loan.
Rust execution belongs only to CI after all eight same-SHA JS gates pass.

The complete source archive SHA is
b9035a8426ac3c3d5f3f887a529e2bd062007a11b9ba99e517de46dd841e7997.
It retains six actual original parent before/after/inverse equations and three
whole created sources, including the Rust oracle. The shared index retains all
333 earlier rows and appends nine complete lifetime/prior-case equations:
342 equations over245 paths,18 images and385750 new source bytes. Index SHA is
9fd3206365e127c919372bb56e02d72c5282a1a483d92f4c59abb58e133f24f5.
The separate complete engine source history extends333→342 outside its own
hashed graph; earlier roots keep their old domains. The source-index builder
still has exactly `language`, then `repository` sequences and its original
retention/CST/inverse bounds.

Everything in this batch is **UNRUN**. There was no test, parser trial,
translation experiment, compilation, SDK installation, Rust tool or CI/review
inspection. Full executable coverage, complete corpus receiving, source
freshness, roundtrip/runtime/native parity and performance are unqualified.
Source ancestry counts are not application or acceptance coverage. Accounting
remains **11/70 DRAFTED,59 OPEN**; remaining clauses still require drafting.
