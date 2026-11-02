# Original shared standard-map type observations

SOURCE DRAFT, UNRUN. A distinct native type helper now implements private source
observations for written `&BTreeMap<String,String>` and resolved aliases or
qualified paths to those same original standard types. It requires the actual
private parser and complete actual caller scope, original standard namespace
and ordinary prelude route, and the separate scoped borrowed-map source ABI.
There is no opaque-map conversion, collection cap, value-byte cap or trait
theorem for arbitrary generic maps/allocators. Mutable and owned standard-map
inputs are outside this shared-input boundary.

Only actual private parse observations can issue the type. Plain records,
copied kind/ownership markers and source names cannot. Source-link relocation
must preserve the original parsed syntax-node association; the private checker
capture rechecks whole source declarations and source origins. Every type use
reissues the original parser/source/Cargo/std/member boundary, with no saved
body/type verdict. Per-operation captures expire, source failures poison active
operations, and application callbacks retain their separate error behavior.
Whole meta decode must reconstruct and recheck the original caller before any
future target emission; transported type metadata carries no private receipt.

The new helper implements parsing, identity/ownership observation, type keys,
original source-node capture and resolution. It is not yet hooked into the
original Host parser/checker, generic source-link capture, checked-meta issuer,
ownership/type-layout/emitter/interpreter lanes or reverse private families.
Those complete parent successors, qualified production positive source cases,
aliases/shadowing/caught-failure lifecycle cases and receiving scheduling remain
OPEN. The drafted foreign-boundary cases do not qualify those positive routes.
The real stream-query application already uses the shared native helper while
retaining its original BTreeMap signature; no executable translation is claimed.
All verification UNRUN and CI NOT_INSPECTED; no acceptance count changes.
