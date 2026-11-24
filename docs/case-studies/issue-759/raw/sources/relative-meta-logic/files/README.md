# relative-meta-logic

A prototype for logic framework that can reason about anything relative to given probability of input statements.

> **Note on naming:** This project was previously called *Associative-Dependent Logic (ADL)*. The name *Associative Dependent Meta Logic* is also valid, as in [dependent types](https://en.wikipedia.org/wiki/Dependent_type), but *relative* is closer to the concept of a [link](https://github.com/link-foundation/meta-theory), and actually all statements are relative to other statements. The name *meta-logic* reflects that this system can reason about all possible logic systems, including itself.

## Implementations

This project provides two equivalent implementations:

- **[JavaScript](./js/)** — Node.js implementation using the official [links-notation](https://github.com/link-foundation/links-notation) parser
- **[Rust](./rust/)** — Rust implementation using the official [links-notation](https://github.com/link-foundation/links-notation) crate

Both implementations pass the same comprehensive test suites and produce identical results.

For implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).
For versioning, deprecations, and release expectations, see
[Compatibility and release policy](./docs/COMPATIBILITY.md).
For the developer bootstrap, automatic cache cleanup, and safe build wrappers, see
[Build cache lifecycle](./docs/BUILD_CACHE.md).
For the pinned upstream grammar/project APIs, installation provenance and
translation boundaries, see [Upstream language source](./docs/UPSTREAM_LANGUAGE_SOURCE.md).

## Comparisons

- [Core concept comparison](./docs/CONCEPTS-COMPARISON.md) - RML vs Twelf, LF, HELF, Isabelle, Coq/Rocq, Lean, Foundation, AFP, Abella, lambda Prolog, and Pecan by logical/metatheoretic concepts.
- [Product feature comparison](./docs/FEATURE-COMPARISON.md) - RML vs the same systems by authoring workflow, automation, libraries, tooling, and distribution.
- [Configurability and operator redefinition](./docs/CONFIGURABILITY.md) - Why every operator, truth constant, range, and valence is redefinable at runtime, with the precedence rules and a comparison to Lean/Rocq fixed semantics.
- [Foundations and root-construct registry](./docs/FOUNDATIONS.md) - The trust catalogue of every primitive the kernel depends on, the `(foundation …)` / `(with-foundation …)` / `(foundation-report)` surface, the bundled Boolean and Kleene foundations, and the backward-compatibility guarantee.
- [Executable meta-theory](./docs/META_THEORY.md) - A theory-independent linked rewrite/inference machine with link-defined lambda, set, type, graph, relation, and RML programs; checked cross-theory witnesses; and a non-authoritative Lean/Rocq provenance corpus.
- [Typed kernel rules](./docs/KERNEL.md) - The implemented D1 rules for `Pi`, `lambda`, `apply`, `(expr of Type)`, and `(type of expr)`.
- [Soundness statement](./docs/SOUNDNESS.md) - The trusted-kernel guarantee, proof-replay checker, trusted operator base, and aggregator-relative scope of soundness.
- [Metatheorem checker](./docs/METATHEOREMS.md) - The C3 Twelf-style guarantee that composes D12 totality, D14 coverage, D15 modes, and D13 termination, plus the `rml-meta` CLI.
- [Lean 4 export](./docs/LEAN_EXPORT.md) - The `rml export lean` bridge for typed, non-probabilistic RML fragments.
- [Rocq export](./docs/ROCQ-EXPORT.md) - The supported typed LiNo subset for `rml export rocq <file.lino> -o <file.v>`.
- [Language Server](./docs/LANGUAGE_SERVER.md) - Stdio LSP setup for diagnostics, hover, go-to-definition, and completion in Neovim and Helix.

## Tutorials

- [Tutorial path](./docs/tutorials/) - Start here for the progressive
  walkthrough sequence.
- [Classical logic tutorial](./docs/tutorials/classical.md) - Boolean truth
  values, declarations, assignments, queries, and the classical library.
- [Fuzzy logic tutorial](./docs/tutorials/fuzzy.md) - Continuous truth values,
  degree-based predicates, fuzzy connectives, and fuzzy-control helpers.
- [Probabilistic reasoning tutorial](./docs/tutorials/probabilistic.md) -
  Independent events, probabilistic sum, Bayesian-network helpers, and Bayes
  calculations.
- [Typed LiNo tutorial](./docs/tutorials/typed.md) - Type declarations,
  universes, `Pi`, `lambda`, `apply`, and type queries.
- [Metatheory tutorial](./docs/tutorials/metatheory.md) - Modes, coverage,
  totality, termination, and the `rml-meta` CLI.
- [RML in RML self-bootstrap tutorial](./docs/tutorials/self-bootstrap.md) -
  The capstone walkthrough of the encoded grammar, evaluator, type layer,
  operators, metatheorem checker, and bootstrap CI gate.

## Overview

RML (Relative Meta-Logic, formerly Associative-Dependent Logic / ADL) is a minimal probabilistic logic system built on top of [LiNo (Links Notation)](https://github.com/link-foundation/links-notation). It supports [many-valued logics](https://en.wikipedia.org/wiki/Many-valued_logic) from unary (1-valued) through continuous probabilistic ([fuzzy](https://en.wikipedia.org/wiki/Fuzzy_logic)), allowing you to:

Its executable meta-theory makes the bootstrap boundary explicit. An audited
addressed-link program executes matching, substitution, traversal, import
rebinding, inference, and verification over two externally primitive S/K
transition laws;
user-selected foundations then instantiate unchanged object theories. The
measured semantic host surface is two contractions (`S` and `K`), both
experimentally necessary for the current representation and probe. Parsing
and resource bounds remain explicit non-semantic boundary layers. The report
records zero derived host semantic services, zero host/linked duplication,
6/6 self-hosting closure, 2/8 foundation compression, and zero undocumented
runtime paths. The authoritative semantic source is represented as addressed
links rather than emitted by a host-language semantic builder, but S/K are not
presented as native Links Theory laws:
the current host model represents the upstream addressed network as passive
structure and supplies execution separately. Its zero-transition candidate
fails the finite acceptance probe. This is not a claim about link ontology or
globally irreducible semantics: an executable iota witness reconstructs
identity, K, and S with one surface equation, but observes both residual
contractions. It therefore demonstrates vocabulary compression without
claiming less external semantic information.
An architecture-neutral follow-up now runs the same nine-operation workload
through the S/K bootstrap, an independent direct structural interpreter, and
a monotone Horn interpreter. It fault-injects all 13 residual laws, executes a
complete two-counter-machine instruction basis, and checks linked
JavaScript/Rust operational cores plus Lean/Rocq dependent cores in both
runtimes. The comparison still makes no global minimality or production
language claim. It also enforces a symmetric comparison gate: the direct and
Horn implementations remain executable controls, but their host/self
duplication excludes them from ranking against the fully reduced S/K
candidate. The report therefore names no winner. An executable two-model
witness shows only that one ordered-link host representation does not select
between two tested transition functions. A separate v14 experiment starts from
two unlabelled reference occurrences plus equality and exhausts their finite
symmetries. It derives exactly the same-reference/distinct-reference quotient,
no invariant source/target selector, no unique equivariant dynamics, and
representation-dependent reification. It then retains that vocabulary across
widths one through four and derives 1, 2, 3, and 5 multiplicity classes. A
conditional, explicitly unestablished second equivalence yields 33 joint
classes whose reference-only fibres contain 5–9 refinements. Their singleton-
orbit histogram is 20/5/7/1 classes with 0/1/2/4 singleton orbits. Provenance
separates 7 base-forced, 5 refinement-present, 1 interaction-only, and 20
symmetric classes; a same-base countermodel demonstrates refinement-dependent
outcomes. An exhaustive forcedness check then examines all 255 base/candidate
pairs at widths one through four. All 73 candidates that preserve their base
symmetries preserve its occurrence orbits; the interaction-only conditional
instead breaks a relabelling that fixes its base. Its distinctions therefore
require information not derived from that base. These are measured observation
boundaries. A further starting-representation audit compares direct-self
`[0,0,1]` with fresh-external `[0,1,2]`: both project to `[1,1]`, proving that
forgetting the link address loses self-reference. It enumerates
`2/4/7/12` addressable classes versus `1/2/3/5` reference-only classes at
widths one through four and proves non-injectivity for every nonzero finite
arity. A quotient audit then derives address-renaming equivalence from the
complete equality matrix but marks occurrence permutation
`UNESTABLISHED_EQUIVALENCE`; that step collapses `0/1/8/40` ordered classes.
Only after declaring unlabelled occurrences do reference multiplicity and
direct-self multiplicity form a complete descriptor of the addressable
classes. Before that quotient, an explicit Boolean mask classifies
self-incidence per ordered reference slot: all `2/4/8/16` masks occur at
widths one through four, address renaming preserves them, and slot permutation
transports them equivariantly. The reference-equality matrix plus this mask is
complete for the tested ordered address/equality patterns, without proving
that slot identity or endpoint meaning is intrinsic. That local descriptor
does not compose across multiple links: at two through four ordered
one-reference links, products of the local descriptors collapse
`10/77/799` shared-address classes to `4/8/16`. An external-reference pair
and a two-link incidence cycle have the same local descriptors but are
inequivalent in the shared address space. Cross-reference equality plus
reference-to-link-address
incidence restores a complete descriptor for the tested contract, without
calling that incidence a source, target, dependency, transition, or execution
edge. These results do not complete link ontology or establish an unbounded
classification theorem. A v11 structural probe also keeps mathematical
implication separate from binary links. The recursive candidates
`[[3,0,1],[4,3,2]]` and `[[3,1,2],[4,0,3]]` coincide only after the
still-unestablished uniform slot reversal. The connected raw structure
`[[3,0,1],[4,1,2],[5,2,0],[6,6,3]]` keeps `P`/`Q` distinct from `K`/`A`/`B`
and has self-incidence, shared address, recursion, and `[2,0]`, but no proposed
`[0,2]` result. Adding `[7,0,2]` preserves every premise, while formation
admits all 49 ordered pairs over the existing addresses. Thus the result is
formable but not entailed or selected;
function roles, composition, and execution require additional justified
structure. The v11 authority follow-up adds one ordinary incidence link to two
duplicate result candidates. That link breaks their swap symmetry, making
singleton selection expressible, but both opposite singleton readings remain
equivariant. Removal, replacement, duplication, isomorphic forgery, context
relocation, and finite/self-referential authority chains show that incidence
can carry a distinction without authenticating or activating it. This does not
prove that external authority is irreducible. A linked-certificate follow-up
checks exact-cover reconstruction and explicit context incidence. It rejects
missing, duplicated, foreign, and wrong evidence and observes
`ZERO`/`ONE`/`MANY` passing candidates, but a locally isomorphic second
candidate also passes. The verifier, role assignment, and cardinality reading
remain explicitly external rather than self-authorized by those links. The
v11 local-verifier probe replaces specialized record reconstruction with a
reusable three-position incidence join and records each match as four ordinary
links. Trace replay and self-application work conditionally, while host
iteration, equality, counting, and the choice of description and mapping role
remain external. The report keeps link ontology, intrinsic authority,
primitive categories, the structure/transformation
relation, and comparative minimality unresolved; classifies all three
implementations as executable controls that cannot constrain the ontology
search; and selects no target architecture. See the
[foundation-search report](./docs/case-studies/issue-183/foundation-search.md).
Lambda, set, type, graph, relation, and RML semantics remain linked programs,
not host callbacks or external-kernel decisions. Lean/Rocq artifacts are
parity evidence only.

- Define terms
- Assign probabilities (truth values) to logical expressions
- Redefine logical operators with different semantics
- Configure truth value ranges: `[0, 1]` or `[-1, 1]` (balanced/symmetric)
- Configure logic valence: 2-valued ([Boolean](https://en.wikipedia.org/wiki/Boolean_algebra)), 3-valued ([ternary/Kleene](https://en.wikipedia.org/wiki/Three-valued_logic)), N-valued, or continuous
- Use and redefine truth constants: `true`, `false`, `unknown`, `undefined`
- Use and redefine Belnap operators: `both...and` (contradiction/avg) and `neither...nor` (gap/product)
- Resolve paradoxical statements (e.g. the [liar paradox](https://en.wikipedia.org/wiki/Liar_paradox))
- Perform decimal-precision arithmetic (`+`, `-`, `*`, `/`) — `0.1 + 0.2 = 0.3`, not `0.30000000000000004`
- Query the truth value of complex expressions
- Define dependent types as links — universe hierarchy, Pi-types, lambdas, type queries
- Combine types with probabilistic logic in a unified framework
- Relate user-defined theories in a cycle-safe links network with shared concept addresses
- Define new executable logics and proof systems entirely as linked programs
- Reuse one theory over replaceable user foundations through rebound imports
- Execute graph theory as a constrained links-network subset and finite typed relational algebra
- Delegate domain-specific decision blocks through evaluator plugins, including
  `(domain automatic-sequences (theorem thue-morse-cube-free))`
- Reuse the evaluator as a library, including a meta-expression adapter that accepts selected interpretations and explicit dependencies while keeping underspecified claims partial
- Export the simply typed LiNo fragment to Isabelle/HOL source for external certification experiments

## Supported Logic Types

![F0C5A9A4-B56E-4B64-8B7E-CC3A650EDAF7_1_201_a](https://github.com/user-attachments/assets/b54e3aaa-8645-4067-8051-6299745a2a3b)

| Valence | Name | Truth Values (in `[0, 1]`) | Truth Values (in `[-1, 1]`) | Reference |
|---------|------|---------------------------|----------------------------|-----------|
| 1 | Unary (trivial) | `{any}` (no quantization) | `{any}` (no quantization) | [Many-valued logic](https://en.wikipedia.org/wiki/Many-valued_logic) |
| 2 | Binary / [Boolean](https://en.wikipedia.org/wiki/Boolean_algebra) | `{0, 1}` (false, true) | `{-1, 1}` (false, true) | [Classical logic](https://en.wikipedia.org/wiki/Classical_logic) |
| 3 | Ternary / [Three-valued](https://en.wikipedia.org/wiki/Three-valued_logic) | `{0, 0.5, 1}` (false, unknown, true) | `{-1, 0, 1}` (false, unknown, true) | [Kleene logic](https://en.wikipedia.org/wiki/Three-valued_logic#Kleene_and_Priest_logics), [Łukasiewicz logic](https://en.wikipedia.org/wiki/%C5%81ukasiewicz_logic), [Balanced ternary](https://en.wikipedia.org/wiki/Balanced_ternary) |
| 4 | Quaternary / [Four-valued](https://en.wikipedia.org/wiki/Four-valued_logic) | `{0, ⅓, ⅔, 1}` | `{-1, -⅓, ⅓, 1}` | [Belnap's four-valued logic](https://en.wikipedia.org/wiki/Four-valued_logic#Belnap) |
| 5 | Quinary | `{0, 0.25, 0.5, 0.75, 1}` | `{-1, -0.5, 0, 0.5, 1}` | [Many-valued logic](https://en.wikipedia.org/wiki/Many-valued_logic) |
| N | [Finite-valued](https://en.wikipedia.org/wiki/Finite-valued_logic) / N-valued | N evenly-spaced levels | N evenly-spaced levels | [Many-valued logic](https://en.wikipedia.org/wiki/Many-valued_logic), [Finite-valued logic](https://en.wikipedia.org/wiki/Finite-valued_logic) |
| 0/∞ | Continuous / [Probabilistic](https://en.wikipedia.org/wiki/Probabilistic_logic) / [Fuzzy](https://en.wikipedia.org/wiki/Fuzzy_logic) | Any value in `[0, 1]` | Any value in `[-1, 1]` | [Probabilistic logic](https://en.wikipedia.org/wiki/Probabilistic_logic) (probability logic), [Fuzzy logic](https://en.wikipedia.org/wiki/Fuzzy_logic), [Infinite-valued logic](https://en.wikipedia.org/wiki/Infinite-valued_logic), [Łukasiewicz ∞-valued](https://en.wikipedia.org/wiki/%C5%81ukasiewicz_logic) |

## Quick Start

### JavaScript

```bash
cd js
npm install
node src/rml-links.mjs ../examples/demo.lino
node src/rml-links.mjs export lean ../examples/lean-export-basic.lino -o out.lean
```

Editor integration is available through the stdio language server; see
[`docs/LANGUAGE_SERVER.md`](./docs/LANGUAGE_SERVER.md) for Neovim and Helix
setup, and [`vscode/`](./vscode/) for an installable VS Code extension with
`.lino` syntax highlighting and LSP-backed diagnostics, hover,
go-to-definition, and completion.

### Rust

```bash
cd rust
cargo run -- ../examples/demo.lino
cargo run -- export lean ../examples/lean-export-basic.lino -o out.lean
```

### Docker

Container images for both implementations live under
[`docker/`](./docker/) and are built on every pull request by the
`docker` GitHub Actions workflow. From the repository root:

```bash
# JavaScript implementation
docker build -f docker/Dockerfile.js -t rml-js .
docker run --rm rml-js                                     # runs examples/demo.lino

# Rust implementation
docker build -f docker/Dockerfile.rust -t rml-rust .
docker run --rm rml-rust                                   # runs examples/demo.lino
```

Both services are also wired into [`docker/docker-compose.yml`](./docker/docker-compose.yml):

```bash
docker compose -f docker/docker-compose.yml run --rm rml-js
docker compose -f docker/docker-compose.yml run --rm rml-rust
```

See [`docker/README.md`](./docker/README.md) for build cache layout,
mounting local `.lino` files, and using the extra `rml-check` and
`rml-meta` binaries from the Rust image.

Examples are language-agnostic and live in [`/examples/`](./examples/). Both
implementations execute the same files and are required to produce identical
output (enforced by `examples/expected.lino` and the shared-examples tests).

Shared regression inputs live in [`/test-corpus/`](./test-corpus/). Both
implementations walk `test-corpus/*.lino` and compare query results against
`test-corpus/expected.lino`.

The `parity` GitHub Actions workflow also builds the Rust CLI and runs
`node scripts/check-corpus-parity.mjs`, which executes every root
`test-corpus/*.lino` file through both implementations and fails when their
exit status, stdout, or stderr diverge. To run the same parity gate locally:

```bash
cd js && npm ci
cd ..
cargo build --manifest-path rust/Cargo.toml --bin rml
node scripts/check-corpus-parity.mjs
```

The `bootstrap` GitHub Actions workflow runs the host-driven encoded evaluator
from [`lib/self/evaluator.lino`](./lib/self/evaluator.lino) over every root
`test-corpus/*.lino` file and fails if any encoded RML result diverges from the
host JavaScript evaluator. To run the same bootstrap gate locally:

```bash
cd js
npm ci
npm run test:bootstrap
```

### Literate LiNo

Evaluator entry points also accept literate `.lino.md` files. Prose is ignored
and only fenced `lino` code blocks are evaluated, so mathematical exposition
and runnable declarations can live in the same file:

````markdown
# Theorem

```lino
(a: a is a)
((a = a) has probability 1)
(? (a = a))
```
````

The same extraction is used for files loaded through `(import "...")`.

### Standard libraries

Reusable LiNo libraries live under [`/lib/`](./lib/). The classical Boolean
library configures two-valued truth values and exports connectives, laws, and
natural-deduction rule schemas from the `classical` namespace:

```lino
(import "lib/classical/core.lino" as cl)
(? (cl.or p (cl.not p)))
(? (cl.excluded-middle p))
```

The first-order library exports aliasable quantifier templates from the
`first-order` namespace:

```lino
(import "lib/first-order/core.lino" as fo)
(? (fo.forall (Term x) (predicate x)))
(? ((fo.exists (Term x) (predicate x)) = (exists (Term x) (predicate x))))
```

The higher-order library exports quantifier templates for predicate binders
from the `higher-order` namespace:

```lino
(import "lib/higher-order/core.lino" as ho)
(? (ho.forall ((Pi (Natural n) Boolean) P)
     ((P zero) implies (ho.forall (Natural n) (P (succ n))))))
```

The modal library exports normal modal operators, K/T/S4/S5 axiom schemas,
and Kripke-frame interpretation templates from the `modal` namespace:

```lino
(import "lib/modal/core.lino" as ml)
(? (ml.axiom-k p q))
(? (ml.necessarily-at current p))
```

The provability library exports GL axiom schemas and a basic interpretability
fragment from the `provability` namespace:

```lino
(import "lib/provability/core.lino" as pr)
(? (pr.provability-of p))
(? (pr.axiom-gl p))
(? (pr.interprets theory-a theory-b))
```

The set-theory library exports membership, basic set constructors, and
ZF-style axiom schemas from the `set-theory` namespace:

```lino
(import "lib/set-theory/core.lino" as st)
(? (st.member-of x (set-of-naturals)))
(? (st.axiom-extensionality a b))
```

The [arithmetic library](./lib/arithmetic/core.lino) exports Peano naturals,
addition/order templates, and decimal-precision lemmas from the `arithmetic`
namespace:

```lino
(import "lib/arithmetic/core.lino" as ar)
(? ((plus zero zero) = zero))
(? (ar.less-than zero (succ zero)))
(? (ar.decimal-sum-equals 0.1 0.2 0.3))
```

The [algebra library](./lib/algebra/core.lino) exports operation laws and
magma, semigroup, monoid, group, abelian-group, and unital-ring schemas from
the `algebra` namespace:

```lino
(import "lib/algebra/core.lino" as al)
(? (al.group (carrier G) (op times) (identity e) (inverse inv)))
(? (al.ring R plus zero neg times one))
```

The [programming-language theory library](./lib/programming-language/core.lino)
exports untyped lambda-calculus constructors, simply typed lambda calculus
typing and small-step schemas, and type-safety theorem forms from the
`programming-language` namespace:

```lino
(import "lib/programming-language/core.lino" as pl)
(? (pl.theorem progress (pl.progress term T)))
(? (pl.theorem preservation (pl.preservation term next T)))
```

The [probabilistic library](./lib/probabilistic/) packages Bayesian-network,
fuzzy-control, Belnap-bilattice, and paradox-catalogue helpers as standard
LiNo imports:

```lino
(import "lib/probabilistic/bayesian.lino" as bn)
(import "lib/probabilistic/fuzzy.lino" as fz)
(import "lib/probabilistic/belnap.lino" as bl)
(import "lib/probabilistic/paradoxes.lino" as px)
(bn.network sprinkler-network (nodes cloudy rain) (edges (bn.edge cloudy rain)))
(bn.prior rain 0.5)
(fz.membership temperature hot 0.8)
(fz.membership humidity wet 0.6)
(s: s is s)
(px.midpoint (px.liar s))
(? (bn.joint (rain = true) (rain = true)))
(? (fz.rule (fz.degree temperature hot) (fz.degree humidity wet)))
(? (bl.contradiction true false))
(? (px.fixed-point (px.liar s)))
```

The [self grammar library](./lib/self/grammar.lino) encodes the LiNo grammar as
links so self-hosted parsing work can consume grammar rules through ordinary
LiNo data.

The [self evaluator library](./lib/self/evaluator.lino) encodes the RML host
evaluator as `(rule ...)` links, including the built-in arithmetic, comparison,
logical, equality, normalization, and typed-kernel evaluation forms.
Representative evaluator inputs are covered by the shared
[`test-corpus/`](./test-corpus/) regression suite.

### Isabelle export

```bash
node js/src/rml-links.mjs export isabelle examples/isabelle-typed-fragment.lino -o Isabelle_Typed_Fragment.thy
```

The exporter covers the simply typed fragment documented in
[`docs/ISABELLE-EXPORT.md`](./docs/ISABELLE-EXPORT.md).

### Rocq Export

Both CLIs can translate the supported typed fragment to Rocq source:

```bash
node js/src/rml-links.mjs export rocq examples/dependent-types.lino -o dependent_types.v
cargo run --manifest-path rust/Cargo.toml -- export rocq examples/dependent-types.lino -o dependent_types.v
```

See [docs/ROCQ-EXPORT.md](./docs/ROCQ-EXPORT.md) for the accepted subset.

### Example

Create a file `example.lino`:

```lino
# Classical Boolean logic
(valence: 2)
(and: min)
(or: max)

# Define propositions
(p: p is p)
(q: q is q)

# Assign truth values
((p = true) has probability 1)
((q = true) has probability 0)

# Query
(? ((p = true) and (q = true)))          # -> 0 (true AND false = false)
(? ((p = true) or (q = true)))           # -> 1 (true OR false = true)
(? ((p = true) or (not (p = true))))     # -> 1 (law of excluded middle)
```

Output:
```
0
1
1
```

## Syntax

### Term Definitions

```lino
(term_name: term_name is term_name)
```

Example: `(a: a is a)` declares `a` as a term.

### Probability Assignments

```lino
((<expression>) has probability <value>)
```

Example: `((a = a) has probability 1)` assigns probability 1 to the expression `a = a`.

### Templates

```lino
(template (<name> <param>...)
  <body>)
```

Templates name reusable link shapes. A later use `(<name> arg...)` is expanded before evaluation, and template placeholders are substituted hygienically so binders introduced by the template do not capture free variables from the arguments.

```lino
(template (known expr value)
  (expr has probability value))

(known (a = b) 1)
(? (a = b))  # -> 1
```

### Range Configuration

```lino
(range: <lo> <hi>)
```

Sets the truth value range. Default is `[0, 1]` (standard probabilistic). Use `(range: -1 1)` for balanced/symmetric range where the midpoint is 0.

See: [Balanced ternary](https://en.wikipedia.org/wiki/Balanced_ternary)

### Valence Configuration

```lino
(valence: <N>)
```

Sets the number of discrete truth values. Default is `0` (continuous, no quantization).

- `(valence: 2)` — [Boolean logic](https://en.wikipedia.org/wiki/Boolean_algebra): truth values are quantized to `{0, 1}`
- `(valence: 3)` — [Ternary logic](https://en.wikipedia.org/wiki/Three-valued_logic): truth values are quantized to `{0, 0.5, 1}`
- `(valence: N)` — [N-valued logic](https://en.wikipedia.org/wiki/Many-valued_logic): truth values are quantized to N evenly-spaced levels

### Truth Constants

The symbols `true`, `false`, `unknown`, and `undefined` are predefined with values based on the current range:

| Constant | Default in `[0, 1]` | Default in `[-1, 1]` | Definition | Interpretation |
|----------|---------------------|----------------------|------------|----------------|
| `true`   | `1`                 | `1`                  | `max(range)` | Definitely true |
| `false`  | `0`                 | `-1`                 | `min(range)` | Definitely false |
| `unknown` | `0.5`              | `0`                  | `mid(range)` | Truth value not known |
| `undefined` | `0.5`            | `0`                  | `mid(range)` | Not yet defined |

These constants can be used directly in expressions:

```lino
(? true)              # -> 1 in [0,1], 1 in [-1,1]
(? false)             # -> 0 in [0,1], -1 in [-1,1]
(? unknown)           # -> 0.5 in [0,1], 0 in [-1,1]
(? (not true))        # -> 0 in [0,1], -1 in [-1,1]
(? (true and false))  # -> 0.5 (avg), 0 (avg in [-1,1])
```

All truth constants can be **redefined** to custom values:

```lino
(true: 0.8)           # Redefine true to 0.8
(false: 0.2)          # Redefine false to 0.2
(? true)              # -> 0.8
(? false)             # -> 0.2
```

### Belnap Operators: `both` and `neither`

The operators `both` and `neither` come from [Belnap's four-valued logic](https://en.wikipedia.org/wiki/Four-valued_logic#Belnap), where contradictions and gaps are first-class concepts. These are **composite natural language operators** that alter the AND operation:

| Operator | Default Aggregator | Example | Result | Interpretation |
|----------|-------------------|---------|--------|----------------|
| `both...and` | `avg` | `(both true and false)` | `0.5` | Both true and false (contradiction) |
| `neither...nor` | `product` | `(neither true nor false)` | `0` | Neither true nor false (gap) |

```lino
# Contradiction: both true and false
(? (both true and false))     # -> 0.5 (avg of 1 and 0)
(? (both true and true))      # -> 1   (both agree: true)

# Gap: neither true nor false
(? (neither true nor false))  # -> 0   (product of 1 and 0)
(? (neither true nor true))   # -> 1   (both agree: true)
```

Both operators are **redefinable** via aggregator selection, just like `and` and `or`:

```lino
(both: min)                   # Redefine both to use min
(? (both true and false))     # -> 0
(neither: max)                # Redefine neither to use max
(? (neither true nor false))  # -> 1
```

This allows paradoxes like the [liar paradox](https://en.wikipedia.org/wiki/Liar_paradox) to be expressed naturally:

```lino
(a: a is a)
((a = a) has probability 1)
((a != a) has probability 0)
(? (both (a = a) and (a != a)))     # -> 0.5 (contradiction resolves to midpoint)
(? (neither (a = a) nor (a != a)))  # -> 0   (gap: no info propagates)
```

When the range changes (via `(range: ...)`), all truth constants are automatically re-initialized to their defaults for the new range.

### Operator Redefinitions

#### Binary operator composition

```lino
(operator: unary_op binary_op)
```

Example: `(!=: not =)` defines `!=` as the negation of `=`.

#### Aggregator selection

For `and` and `or` operators, you can choose different aggregators:

```lino
(and: avg)               # Average (default)
(and: min)               # Minimum (Kleene/Łukasiewicz AND)
(and: max)               # Maximum
(and: product)           # Product (also: prod)
(and: probabilistic_sum) # Probabilistic sum: 1 - (1-p1)*(1-p2)*... (also: ps)

(or: max)                # Maximum (default, Kleene/Łukasiewicz OR)
(or: avg)                # Average
(or: min)                # Minimum
(or: product)            # Product (also: prod)
(or: probabilistic_sum)  # Probabilistic sum (also: ps)
```

### Arithmetic

```lino
(<A> + <B>)   # Addition
(<A> - <B>)   # Subtraction
(<A> * <B>)   # Multiplication
(<A> / <B>)   # Division
```

All arithmetic uses **decimal-precision rounding** (12 significant decimal places) to eliminate IEEE-754 floating-point artefacts:

```lino
(? (0.1 + 0.2))             # -> 0.3  (not 0.30000000000000004)
(? ((0.1 + 0.2) = 0.3))     # -> 1    (true)
(? ((0.3 - 0.1) = 0.2))     # -> 1    (true)
```

Arithmetic operands are not clamped to the logic range, allowing natural numeric computation. Clamping occurs only when results are used in a logical context (queries, `and`, `or`, etc.).

### Queries

```lino
(? <expression>)
```

Queries are evaluated and their truth value is printed to stdout.

### Comments

```lino
# Line comments start with #
(a: a is a)  # A comment can also follow a closing parenthesis
(# A comment link is left out as well)
# A comment may hold an unmatched ( or a quote: it's
(? (a = a))
```

A line whose first character other than a space or a tab is `#` is a
comment, and so is the rest of a line from a `#` that follows a `)` and at
least one space or tab. A `#` inside a quoted reference, as in `'#'`, is an
ordinary character. Both runtimes apply these rules in the shared LiNo front
end (`js/src/rml-lino-frontend.mjs` and `rust/src/lino_frontend.rs`), which
reads the whole file before any form runs: text that is not valid LiNo is
reported once as `E006` at the position of the failure (see
[`docs/DIAGNOSTICS.md`](docs/DIAGNOSTICS.md)).

### Dependent Type System

Types are just links — "everything is a link". The type system coexists with probabilistic logic. ADL is a **dynamic axiomatic system**: every link is a recursive fractal, definitions can be changed at any time, and the system embraces self-reference and paradoxes rather than forbidding them.

#### Self-Referential Type: `(Type: Type Type)`

The primary way to define the root type in ADL is self-referential — Type is its own type:

```lino
(Type: Type Type)
```

This follows the pattern `(SubType: Type SubType)` applied to Type itself. Unlike classical type theory (Lean, Rocq) which forbids `Type : Type` to avoid Russell's paradox, ADL's many-valued logic **resolves paradoxes** to the midpoint of the truth value range (0.5 in `[0,1]`, 0 in `[-1,1]`). This makes self-referential types safe and useful.

```lino
(Type: Type Type)
(Natural: Type Natural)
(Boolean: Type Boolean)
(zero: Natural zero)
(true-val: Boolean true-val)
(? (Type of Type))               # -> 1
(? (Natural of Type))            # -> 1
(? (zero of Natural))            # -> 1
(? (type of Natural))            # -> Type
```

#### Universe Hierarchy (Lean/Rocq Compatibility)

For compatibility with Lean 4 and Rocq (Coq), ADL also supports a stratified **universe hierarchy** where each `(Type N)` is a member of `(Type N+1)`:

- `(Type 0)` — the universe of "small" types (Natural, Boolean, etc.)
- `(Type 1)` — the universe that contains `(Type 0)` and types formed from `(Type 0)` types
- `(Type 2)` — contains `(Type 1)`, and so on

This mirrors Lean 4 (`Type 0`, `Type 1`, ...) and Rocq (`Set`, `Type`, ...).

Both systems can coexist — use `(Type: Type Type)` for the self-referential approach, and `(Type N)` when you need stratified universes:

```lino
(Type: Type Type)
(Type 0)
(Type 1)
(Natural: (Type 0) Natural)      # Natural in universe 0
(Boolean: Type Boolean)           # Boolean under self-referential Type
(? (Natural of (Type 0)))        # -> 1
(? (Boolean of Type))            # -> 1
(? ((Type 0) of (Type 1)))       # -> 1
```

#### Type Declarations

```lino
# Type definition follows the pattern: (SubType: Type SubType)
(Type: Type Type)
(Natural: Type Natural)
(Boolean: Type Boolean)

# Typed term via prefix type notation: (name: TypeName name)
(zero: Natural zero)
(true-val: Boolean true-val)
```

#### Pi-types (Dependent Products)

```lino
# (Pi (TypeName varName) ReturnType)
(succ: (Pi (Natural n) Natural))
```

#### Lambda Abstraction

```lino
# (lambda (TypeName varName) body)
(identity: lambda (Natural x) x)

# Multi-parameter: (lambda (TypeName x, TypeName y) body)
(add: lambda (Natural x, Natural y) (x + y))
```

#### Application

```lino
# Explicit: (apply function argument)
(? (apply identity 0.7))         # -> 0.7

# Prefix: (functionName argument)
(? (identity 0.7))               # -> 0.7
```

#### Program Extraction

Typed lambda programs that do not use probabilistic operators can be extracted
to JavaScript or Rust:

```bash
rml extract js program.lino > program.mjs
rml extract rust program.lino > program.rs
```

Extraction erases LiNo type annotations, turns named lambda definitions into
plain functions, and converts equality queries into generated tests. Programs
that contain probability assignments or logical/probabilistic operators are
rejected instead of being silently compiled.

#### Normalization

Two surface-form drivers expose the typed-fragment normalizer. `whnf`
reduces only the outer spine; `nf` (alias `normal-form`) reduces every
redex, including those nested under binders.

```lino
(Term: (Type 0) Term)
(zero: Term zero)
(succ: (Pi (Term n) Term))
(compose: lambda (Term f) (lambda (Term g) (lambda (Term x) (apply f (apply g x)))))

(? (whnf (apply (apply (apply compose succ) succ) zero)))
# -> (apply succ (apply succ zero))   # outer spine reduced, inner redex left

(? (normal-form (apply (apply (apply compose succ) succ) zero)))
# -> (succ (succ zero))               # full beta-normal form
```

Both are also available as library functions: `whnf(term, ctx)` and
`nf(term, ctx)` in JavaScript, `whnf(&term, &mut env)` and
`nf(&term, &mut env)` in Rust.

#### Tactic Links

The library exposes a tactic engine for composable proof-state steps while
preserving the "everything is a link" invariant. Tactics are ordinary links,
and successful tactic history is stored as links in the proof state:

```lino
(by reflexivity)
(symmetry)
(transitivity b)
(suppose (p = q))
(introduce n)
(rewrite (a = b) in goal)
(rewrite <- (a = b) in goal at 2)
(simplify in goal)
(by smt)
(by atp)
(exact (p = q))
(induction n
  (case zero (by reflexivity))
  (case (succ m) (by reflexivity)))
```

Programmatic APIs:

- JavaScript: `runTactics(state, tactics, options)` returns `{ state, diagnostics }`;
  `rewrite(goal, eq)`, `simplify(goal, rules)`, `goalToTptp(...)`, and
  `parseAtpStatus(...)` expose the rewrite and ATP bridge helpers.
- Rust: `run_tactics(state, tactics)` and `run_tactics_with_options(...)`
  return `TacticRunResult`; `rewrite(...)`, `simplify(...)`,
  `goal_to_tptp(...)`, and `parse_atp_status(...)` expose the rewrite and ATP
  bridge helpers.

`(by smt)` serializes the current goal to an SMT-LIB check by asserting the
negated goal and closes the goal only when the configured solver returns
`unsat`. Successful runs record `(by smt-trusted <solver>)` in the proof
state. JavaScript accepts `smtSolver`, `smtSolverArgs`, and `smtTimeoutMs`
options; Rust accepts the corresponding `TacticOptions` fields
`smt_solver`, `smt_solver_args`, and `smt_timeout_ms`. The environment
variables `RML_SMT_SOLVER`, `RML_SMT_ARGS`, and `RML_SMT_TIMEOUT_MS` provide
defaults in both runtimes.

`(by atp)` exports the current first-order goal and local context as TPTP FOF,
invokes a configured ATP path, accepts proving SZS statuses, and records
`(by atp-trusted <solver>)` in the proof state. JavaScript accepts `atpPath`,
`atpArgs`, `atpName`, and `atpTimeoutMs` options or an `atp` object with
`path`, `args`, `name`, and `timeoutMs`; Rust accepts the corresponding
`TacticOptions.atp` fields.

The built-in tactic set is `reflexivity`, `symmetry`, `transitivity`,
`induction`, `suppose`, `introduce`, `by`, `rewrite`, `simplify`, `smt`,
`atp`, and `exact`. Failed tactics emit `E039` diagnostics that include the
current goal.

#### Type Queries

```lino
# Type check: (expr of Type) — returns 1 (true) or 0 (false)
(? (zero of Natural))            # -> 1
(? (Natural of Type))            # -> 1

# Type inference: (type of expr) — returns the type name
(? (type of zero))               # -> Natural
```

#### Paradox Resolution in the Type System

In classical type theory, `Type : Type` leads to [Russell's paradox](https://en.wikipedia.org/wiki/Russell%27s_paradox). ADL handles this differently — paradoxes are resolved to the midpoint truth value (0.5), not rejected:

```lino
(Type: Type Type)
(s: s is s)
((s = false) has probability 0.5)
(? (s = false))                  # -> 0.5 (paradox resolves to midpoint)
(? (not (s = false)))            # -> 0.5 (fixed point of negation)
(? (Type of Type))               # -> 1   (self-referential type works)
```

This means ADL can serve as a **meta-theory** for both classical and non-classical type systems, since it can express and reason about constructs that would be inconsistent in traditional frameworks.

## Built-in Operators

- `=`: Equality (checks assigned probability, then structural equality, then numeric comparison with decimal precision)
- `!=`: Inequality (defined as `not =` by default)
- `not`: Logical negation — mirrors around the midpoint of the range (`1 - x` in `[0,1]`; `-x` in `[-1,1]`)
- `and`: Conjunction (average by default, configurable)
- `or`: Disjunction (maximum by default, configurable)
- `+`: Addition (decimal-precision)
- `-`: Subtraction (decimal-precision)
- `*`: Multiplication (decimal-precision)
- `/`: Division (decimal-precision, returns 0 on division by zero)

## Examples

Example `.lino` files are available in the shared root [`examples/`](./examples/) directory. They are executed by both the JavaScript and the Rust implementations, and the canonical outputs every implementation must reproduce live in [`examples/expected.lino`](./examples/expected.lino) — itself written in Links Notation, so the contract between the two implementations is expressed in the same language as the examples. Examples progress from standard, familiar logic systems to more advanced and non-standard constructions.

### Classical Logic (Boolean, 2-valued)

See `examples/classical-logic.lino` — the most familiar logic system where every proposition is either true or false:

```lino
(valence: 2)
(and: min)
(or: max)

(p: p is p)
((p = true) has probability 1)

(? (p = true))                          # -> 1 (true)
(? (not (p = true)))                    # -> 0 (false)
(? ((p = true) or (not (p = true))))    # -> 1 (law of excluded middle)
(? ((p = true) and (not (p = true))))   # -> 0 (law of non-contradiction)
```

For reusable imports, see `lib/classical/core.lino`, which packages these
Boolean connectives plus excluded middle, double negation, De Morgan laws, and
natural-deduction rule schemas under the `classical` namespace.

### Propositional Logic (Probabilistic)

See `examples/propositional-logic.lino` — multiple propositions with standard probabilistic connectives:

```lino
(and: product)              # P(A ∩ B) = P(A) * P(B)
(or: probabilistic_sum)     # P(A ∪ B) = 1 - (1-P(A))*(1-P(B))

((rain = true) has probability 0.3)
((umbrella = true) has probability 0.6)

(? ((rain = true) and (umbrella = true)))   # -> 0.18
(? ((rain = true) or (umbrella = true)))    # -> 0.72
(? (not (rain = true)))                     # -> 0.7
```

### Fuzzy Logic (Continuous)

See `examples/fuzzy-logic.lino` — standard [Zadeh fuzzy logic](https://en.wikipedia.org/wiki/Fuzzy_logic) where truth values represent degrees of membership:

```lino
(and: min)
(or: max)

((a = tall) has probability 0.8)
((b = tall) has probability 0.3)

(? ((a = tall) and (b = tall)))   # -> 0.3  (min)
(? ((a = tall) or (b = tall)))    # -> 0.8  (max)
(? (not (a = tall)))              # -> 0.2  (complement)
```

### Ternary Kleene Logic (3-valued)

See `examples/ternary-kleene.lino` — [Kleene's strong three-valued logic](https://en.wikipedia.org/wiki/Three-valued_logic#Kleene_and_Priest_logics):

```lino
(valence: 3)
(and: min)
(or: max)

(? (0.5 and 1))          # -> 0.5  (unknown AND true = unknown)
(? (0.5 and 0))          # -> 0    (unknown AND false = false)
(? (0.5 or 1))           # -> 1    (unknown OR true = true)
(? (0.5 or (not 0.5)))   # -> 0.5  (law of excluded middle FAILS!)
```

In [Kleene logic](https://en.wikipedia.org/wiki/Three-valued_logic#Kleene_and_Priest_logics), the law of excluded middle (`A ∨ ¬A`) is **not** a tautology — this is the key difference from [classical logic](https://en.wikipedia.org/wiki/Classical_logic).

### Belnap's Four-Valued Logic

See `examples/belnap-four-valued.lino` — extends classical logic with `both...and` (contradiction) and `neither...nor` (gap) **composite natural language operators** that alter the AND operation. This is the standard framework for reasoning about paradoxes:

```lino
(and: min)
(or: max)

(? (both true and false))     # -> 0.5  (contradiction: avg of 1 and 0)
(? (neither true nor false))  # -> 0    (gap: product of 1 and 0)
(? (both true and true))      # -> 1    (agree: avg of 1 and 1)

# The liar paradox resolves naturally via "both"
(s: s is s)
((s = false) has probability 0.5)
(? (s = false))               # -> 0.5
```

See: [Belnap's four-valued logic](https://en.wikipedia.org/wiki/Four-valued_logic#Belnap)

### Liar Paradox Resolution

The [liar paradox](https://en.wikipedia.org/wiki/Liar_paradox) ("this statement is false") is irresolvable in classical 2-valued logic. In many-valued logics (ternary and above), it resolves to the **midpoint** of the range — the fixed point of negation.

See `examples/liar-paradox.lino` — resolution in `[0, 1]` range:

```lino
(s: s is s)

((s = false) has probability 0.5)
(? (s = false))          # -> 0.5  (50% from 0% to 100%)
(? (not (s = false)))    # -> 0.5  (fixed point: not(0.5) = 0.5)
```

See `examples/liar-paradox-balanced.lino` — resolution in `[-1, 1]` range:

```lino
(range: -1 1)
(s: s is s)

((s = false) has probability 0)
(? (s = false))          # -> 0   (0% from -100% to 100%)
(? (not (s = false)))    # -> 0   (fixed point: not(0) = 0)
```

### Custom Operators (avg semantics)

See `examples/demo.lino` — demonstrates the configurable nature of operators with avg-based AND:

```lino
(a: a is a)
(!=: not =)
(and: avg)     # non-standard: average instead of min
(or: max)

((a = a) has probability 1)
((a != a) has probability 0)

(? ((a = a) and (a != a)))   # -> 0.5
(? ((a = a) or  (a != a)))   # -> 1
```

See `examples/flipped-axioms.lino` — demonstrates that the system handles arbitrary probability assignments:

```lino
(a: a is a)
(!=: not =)
(and: avg)
(or: max)

((a = a) has probability 0)
((a != a) has probability 1)

(? ((a = a) and (a != a)))   # -> 0.5 (same result — avg is symmetric)
```

### Bayesian Inference

RML natively supports [Bayesian inference](https://en.wikipedia.org/wiki/Bayesian_inference) and [Bayesian networks](https://en.wikipedia.org/wiki/Bayesian_network). Links notation naturally describes networks of any complexity — each node's probability is a link, and joint/marginal probabilities are computed using the `product` and `probabilistic_sum` aggregators.

See `examples/bayesian-inference.lino` — [Bayes' theorem](https://en.wikipedia.org/wiki/Bayes%27_theorem) applied to medical diagnosis (directed: Disease → Test Result):

```lino
# P(Disease) = 0.01, P(Positive|Disease) = 0.95, P(Positive|~Disease) = 0.05
# Bayes' theorem: P(Disease|Positive) = P(Pos|D)*P(D) / P(Pos)

(? (0.95 * 0.01))                                        # -> 0.0095
(? ((0.95 * 0.01) + (0.05 * 0.99)))                     # -> 0.059
(? ((0.95 * 0.01) / ((0.95 * 0.01) + (0.05 * 0.99))))  # -> 0.161017
```

See `examples/bayesian-network.lino` — a directed acyclic [Bayesian network](https://en.wikipedia.org/wiki/Bayesian_network) (DAG) with `product` and `probabilistic_sum` aggregators:

```lino
(and: product)              # P(A ∩ B) = P(A) * P(B)
(or: probabilistic_sum)     # P(A ∪ B) = 1 - (1-P(A))*(1-P(B))

(((cloudy) = true) has probability 0.5)
(((rain) = true) has probability 0.5)

(? (((cloudy) = true) and ((rain) = true)))   # -> 0.25 (joint)
(? (((cloudy) = true) or ((rain) = true)))    # -> 0.75 (union)
```

### Markov Chains with Dependent Probabilities

RML can model [Markov chains](https://en.wikipedia.org/wiki/Markov_chain) where transition probabilities depend on the current state. Using arithmetic and the [law of total probability](https://en.wikipedia.org/wiki/Law_of_total_probability), multi-step state evolution is computed naturally.

See `examples/markov-chain.lino` — a weather model with directed transitions (today → tomorrow):

```lino
# Transition matrix: P(Sunny→Sunny)=0.8, P(Rainy→Sunny)=0.4
# Initial: P(Sunny)=0.7, P(Rainy)=0.3

# One-step: P(Sunny at t+1) = P(S→S)*P(S) + P(R→S)*P(R)
(? ((0.8 * 0.7) + (0.4 * 0.3)))   # -> 0.68
(? ((0.2 * 0.7) + (0.6 * 0.3)))   # -> 0.32

# Joint probability using product aggregator
(and: product)
(? (0.8 and 0.7))                  # -> 0.56
```

### Markov Networks (Cyclic Graphs)

As the structural opposite of acyclic Bayesian networks, RML can also model [Markov networks](https://en.wikipedia.org/wiki/Markov_random_field) (Markov random fields) — undirected graphs where cycles are allowed. In links notation, undirected edges are represented as bidirectional link pairs, preserving the fundamental directionality of links.

See `examples/markov-network.lino` — a cyclic social influence model (Alice—Bob—Carol—Alice):

```lino
(and: product)
(or: probabilistic_sum)

(((alice) = agree) has probability 0.7)
(((bob) = agree) has probability 0.5)
(((carol) = agree) has probability 0.6)

# Pairwise joints (cycle: Alice—Bob—Carol—Alice)
(? (((alice) = agree) and ((bob) = agree)))          # -> 0.35
(? (((carol) = agree) and ((alice) = agree)))        # -> 0.42

# Three-way clique
(? (and ((alice) = agree) ((bob) = agree) ((carol) = agree)))  # -> 0.21
```

### Self-Reasoning (Meta-Logic)

As a meta-logic, RML can reason about its own logic system and compare it with other logics.

See `examples/self-reasoning.lino`:

```lino
(Type: Type Type)
(Logic: Type Logic)
(RML: Logic RML)

(((RML supports_many_valued) = true) has probability 1)
(? ((RML supports_many_valued) = true))   # -> 1
(? (RML of Logic))                        # -> 1
(? (type of RML))                         # -> Logic
```

## Testing

Both implementations have matching tests:

```bash
# From the repository root: install both runtime dependency closures, then test.
node scripts/bootstrap.mjs
node scripts/run-with-cache.mjs -- npm --prefix js ci
node scripts/run-with-cache.mjs -- npm --prefix vscode ci --omit=dev
npm --prefix js test

# Rust
node scripts/run-with-cache.mjs -- cargo test --all-targets --manifest-path rust/Cargo.toml

# Machine-readable bootstrap boundary and previous/current delta
npm --prefix js run report:bootstrap-metrics
```

The full JavaScript suite also executes the reconstructed editor server. Its
`links-notation` provider comes from the editor's own locked production
dependencies; the test does not assume an existing local editor installation.

The test suites cover:
- Tokenization, parsing, and quantization
- Evaluation logic and operator aggregators
- Many-valued logics: unary, binary (Boolean), ternary (Kleene), quaternary, quinary, higher N-valued, and continuous (fuzzy)
- Both `[0, 1]` and `[-1, 1]` ranges
- Truth constants (`true`, `false`, `unknown`, `undefined`): defaults, redefinition, range changes, use in expressions, quantization
- Belnap operators (`both...and`, `neither...nor`): default aggregators, redefinition, composite/prefix/infix forms, fuzzy values, range changes
- Liar paradox resolution across logic types
- Decimal-precision arithmetic (`+`, `-`, `*`, `/`) and numeric equality
- Dependent type system: universes, Pi-types, lambdas, application, definitional equality, type queries, prefix type notation
- Link-based tactic engine: reflexivity, symmetry, transitivity, induction, suppose, introduce, by, rewrite, simplify, exact
- Self-referential types: `(Type: Type Type)`, paradox resolution alongside types, coexistence with universe hierarchy
- Bayesian inference: Bayes' theorem, law of total probability, conditional probability, complement rule
- Bayesian networks: joint probability (product), probabilistic sum (probabilistic_sum), multi-node networks, chain rule decomposition
- Self-reasoning: meta-logic properties, comparing logic systems, paradox resolution in meta context
- Markov chains: one-step and multi-step transitions, joint probability, stationary distribution, conditional transitions with links
- Markov networks: cyclic graphs, pairwise joints, three-way cliques, clique potentials, normalization
- Automatic sequences: a Pecan-style domain plugin that decides
  `thue-morse-cube-free`
- Comprehensive valence coverage: 0 (continuous), 1 (unary), 2–10, 100, 1000, with both ranges
- English-readability lint: identifier shape, operator-only links, allow-list (see [English-readability lint](#english-readability-lint))

## API

See language-specific documentation:
- [Online playground](https://link-foundation.github.io/relative-meta-logic/playground/) - browser evaluator with examples and shareable URLs
- [API reference](https://link-foundation.github.io/relative-meta-logic/) - generated from JSDoc and rustdoc on release
- [JavaScript API](./js/README.md#api)
- [Rust API](./rust/README.md#api)

## Diagnostics

Both implementations expose an `evaluate()` entry point that returns a list
of results plus structured diagnostics — every parser, evaluator, and type
checker error carries a stable code (`E001`, …), a message, and a 1-based
source span. The CLIs print them as `file:line:col: Exxx: message` with a
caret under the offending token. See [docs/DIAGNOSTICS.md](./docs/DIAGNOSTICS.md)
for the full code list and usage examples.

## English-readability lint

Every link in `examples/` (and, when introduced, `lib/`) is expected to read
as an English sentence. A small lint script enforces the conventions:

```bash
node scripts/lint-english.mjs --allowlist scripts/lint-english.allowlist.json examples/*.lino
# or, from the JS package:
(cd js && npm run lint:english)
```

The lint reports two classes of violation in `file:line:col: code: message`
form (the same shape used by structured diagnostics):

- `identifiers-without-hyphens` — identifiers that combine multiple words
  with `_` or `camelCase` instead of `kebab-case`. The lint suggests the
  hyphenated form (e.g. `wet_grass` → `wet-grass`).
- `operator-only-link` — an operator definition such as `(@: + -)` whose
  body contains no English word. The lint suggests adding a word-form
  alternative (e.g. `(equals: =)`, `(plus: +)`).

Reserved RML/LiNo vocabulary (`and`, `or`, `not`, `is`, `has`, `probability`,
`true`, `false`, `unknown`, `Type`, `lambda`, …) is never flagged, and
single-word identifiers (`alice`, `cloudy`, `Natural`) are accepted as-is.

### Allow-list

For deliberate exceptions, `scripts/lint-english.allowlist.json` accepts
two arrays:

```json
{
  "identifiers": ["legacy_name"],
  "links": ["demo.lino:5"]
}
```

Identifiers in `identifiers` are silenced wherever they appear; entries in
`links` are keyed by `<basename>:<line>` and silence the
`operator-only-link` rule for that specific definition. CI runs the lint
with this file so any new violation fails the build.

## References

- [Many-valued logic](https://en.wikipedia.org/wiki/Many-valued_logic) — overview of logics with more than two truth values
- [Boolean algebra](https://en.wikipedia.org/wiki/Boolean_algebra) — classical 2-valued logic
- [Three-valued logic](https://en.wikipedia.org/wiki/Three-valued_logic) — ternary logics (Kleene, Łukasiewicz, Bochvar)
- [Łukasiewicz logic](https://en.wikipedia.org/wiki/%C5%81ukasiewicz_logic) — N-valued and infinite-valued extensions
- [Finite-valued logic](https://en.wikipedia.org/wiki/Finite-valued_logic) — discrete many-valued logic with finitely many truth values
- [Infinite-valued logic](https://en.wikipedia.org/wiki/Infinite-valued_logic) — continuous-valued many-valued logic families
- [Fuzzy logic](https://en.wikipedia.org/wiki/Fuzzy_logic) — continuous-valued logic with degrees of truth
- [Probabilistic logic](https://en.wikipedia.org/wiki/Probabilistic_logic) — probability and logic for reasoning under uncertainty
- [Balanced ternary](https://en.wikipedia.org/wiki/Balanced_ternary) — ternary system using {-1, 0, 1}
- [Four-valued logic (Belnap)](https://en.wikipedia.org/wiki/Four-valued_logic#Belnap) — extends classical logic with "both" (contradiction) and "neither" (gap)
- [Liar paradox](https://en.wikipedia.org/wiki/Liar_paradox) — "this statement is false" and its resolution in many-valued logics
- [Bayesian statistics](https://en.wikipedia.org/wiki/Bayesian_statistics) — probability as a measure of belief
- [Bayesian inference](https://en.wikipedia.org/wiki/Bayesian_inference) — updating beliefs based on evidence
- [Bayesian network](https://en.wikipedia.org/wiki/Bayesian_network) — probabilistic graphical models
- [Bayes' theorem](https://en.wikipedia.org/wiki/Bayes%27_theorem) — relating conditional and marginal probabilities
- [Markov chain](https://en.wikipedia.org/wiki/Markov_chain) — stochastic model with state-dependent transitions
- [Law of total probability](https://en.wikipedia.org/wiki/Law_of_total_probability) — computing marginal probabilities from conditionals

## License

See [LICENSE](LICENSE) file.
