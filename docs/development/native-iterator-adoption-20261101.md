# Rust-origin scalar iterator contract adoption — source draft

`tools/translation/native-iterator-adoption-20261101.mjs` adds a concrete
Rust-origin lane. `proposeNativeIteratorAdoption(data, options)` reads a complete
original Rust source from `data.files`, retains the entire declaration/module
and lossless CST, selects a conservative whole-module scalar iterator grammar,
and constructs a complete ordinary caller bridge for the existing private
loop/vector compiler. It emits actual JS, strict TS and canonical Rust with the
existing complete native inverse. It is not another JS-only input inventory.

Options are `family`, `sourcePath`, fresh `javascriptPath`, fresh `rustPath`, and
`functions` naming every original function in the module. Complete original
receiving core, runtime/type, manifest and source inputs remain mandatory. The
original Rust file is never overwritten; canonical adoption Rust uses a fresh
destination. Full original Rust→canonical Rust and ordinary bridge→qualified
bridge source equations preserve both substitution phases and exact inverses.

The token selector is DATA only. It requires the entire module to contain only
plain monomorphic private/public functions with one immutable primitive slice
argument, an explicit primitive Vec result, and a whole tail chain starting
`input.iter().copied()`. Zero through eight pure scalar map/filter adapters and
`collect()`, `collect::<Vec<_>>()` or a matching explicit primitive Vec are
supported. Identity copied collection is included. Literal, primitive operator,
comparison and bounded conditional expressions are selected; filter items require
an explicit scalar dereference or a reference-pattern binding. Every original
function must be selected. Imports, attributes, impls, aliases, generics,
lifetimes, mutable/aggregate references, captures, calls, fields, move closures,
unrecognized statements and reference escapes are refused. Decimal primitive
literals and identical-domain operators are a deliberate initial subset.

Rust iterator adapters are lazy per element. The bridge therefore uses ONE
checked copied-scalar loop, scalar map lets and nested filter predicates, rather
than eager JS map/map arrays. A failure on the first element in a later adapter
still precedes work on a later element in an earlier adapter. Qualified checked
primitive operations preserve evaluation order. A checked addition of zero
before storing each numeric map result joins its actual fixed-width role without
changing an in-domain scalar. The existing private source/meta checker supplies
every actual lowered scalar, ownership, loop and core-operation admission.
Wider input widths retain their original explicit guarded slice prelude.

This is an explicit bounded input/arithmetic contract migration. Whole original
scope selection is lexical; no original Iterator, Copy, type-prefix, namespace,
trait, borrowed callback or crate-activation theorem follows from its spellings.
Original type/iterator-owner, input-contract and body-equivalence flags stay
false. Native Rust's unrestricted input sizes and build-profile arithmetic are
not claimed equivalent to the 4,096-value checked profile. Complete lowered
private source admission does not retroactively authenticate the original Rust
borrowed/closure semantics. Original source remains restorable, and no original
unsupported enclosing production owner is counted as executable.

Source inspection identified these actual production dependency receipts. They
are refusal/work-order evidence, not production unlocks or a function denominator:

| Actual source/function | Observed pattern | Additional unmet prerequisites |
| --- | --- | --- |
| `rust/src/client_policy.rs`, `SubscriptionEntitlementPolicy::overrides` | `self.overrides.iter().copied().collect::<Vec<_>>()` then `sort_by_key(ToString::to_string)` | HashSet-backed self field and impl receiver, SubscriptionOverride record/Copy owner and its enum-valued fields, attribute/visibility scope, mutable vector sorting, trait/method resolution, string key behavior. Enum support alone is insufficient. |
| `rust/src/client_policy.rs`, `SubscriptionEntitlementPolicy::proxied_clients` | copied collection then `sort_by_key(\|client\| client.canonical_name())` | HashSet-backed self field/impl, ClientKind enum/Copy, attribute scope, mutable sorting, canonical_name method/borrowed key semantics. Enum support alone is insufficient. |
| `rust/src/model_routing_snapshot.rs`, `route_subscription_model_for_providers` | copied provider filtering/collection | Captured entitlement slice, provider enum, collection contains/equality, catalog/state calls, async/error/branch ownership and complete policy caller. |
| `rust/src/runtime.rs`, `run_server` | listener record field map/collection | Config/self-like fields, SocketAddr aggregate Copy/type owners, branch/source inference, server/auth/network/error/resource lifecycle and async caller. |
| `rust/src/with_command_claude_settings.rs`, `version_of` | string split/filter/filter_map/collect into u32 | Character classification, borrowed substring callbacks, parsing/Option, short-circuit parse failures and source/type owners. |
| `rust/src/doctor/latest_version.rs`, `parts` | split/map parse/Result collect/array conversion | Borrowed strings, parsing and Result collection, try propagation, fixed-array conversion and complete standard owner/error contracts. |
| `rust/src/client_lifecycle/reset.rs`, `ambient` | copied string names filtered by operation context | ClientKind enum/match, borrowed static strings, captured/environment operation effects and source owner closure. |

No pure-primitive production map/filter/collect unlock was identified by this
review. The independent native originals deliberately mirror actual observed
production chain shapes while keeping unsupported aggregates/captures/policy
behavior explicit. Tests retain full actual production modules and require
refusal rather than stripping enclosing scope to manufacture admission.

New case source covers native identity and map/filter originals, bool/u8/u64,
all original source/declaration inverses, reference-pattern/dereference refusals,
full 4,096-value actual JS and separately lockfile-strict TS receiving execution,
native lazy panic order, whole-scope and real production refusals. The independent
`rust/tests/native_iterator_adoption_20261101.rs` oracle is discovered by gated
Cargo CI. Existing APIs and original 60/20-second case/child limits stay intact.

The existing functional vector target runtime still validates/copies on push;
this new fused Rust-origin lane therefore has a known potential quadratic target
cost until a separately qualified fused-loop specialization is integrated. The
full workloads and deadlines are not reduced to hide it. Default production
dispatch, actual aggregate/enum/owner adoption, general native syntax, export,
platforms, synchronization and parity remain open. Every new parser/compiler,
translator/preparer/interpreter, receiving/runtime/native execution is **UNRUN**.
CI/review feedback was not inspected. No original borrowing equivalence,
production coverage, measured speed or checklist closure is claimed.
