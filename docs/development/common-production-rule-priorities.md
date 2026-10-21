# Common production rule priorities, 2026-10-21

The source audit still starts from **155/2567 executable functions (6.04%)**.
These are complete historical first-refusal memberships, not predicted gains.
Removing a first refusal can expose another blocker. No compiler or Rust oracle
was executed for this audit.

| Family | Distinct functions | Source files | Concrete blocker |
| --- | ---: | ---: | --- |
| HTTP and application state | 238 | 54 | State 95, AppState 70, Response 33, HeaderMap 26, StatusCode 14 |
| Mutation and unique owned edits | 201 | 93 | mutable reference 141, mutable shared reference 24, nonlocal assignment target 36 |
| Literal include closure subset | 54 | 3 | source includes leave original TYPE namespace closure unproved |

HTTP needs a paired compatibility-core contract for opaque application state,
request/response bodies, headers, status and host effects. `State<AppState>` is
not a harmless erased wrapper: actual state contains shared clients, locks,
configuration and routing state. Examples include `account_policy_management`
get/set, `activitypub` handlers and the seven observability handlers. Registering
names or treating all unknown framework types as standard would not check them.

Mutation requires unique owned edit operations with checked alias, evaluation
order and borrow/escape behavior. `HostRustParser.hostTypeSyntax()` explicitly
refuses `&mut`. Of its 141 first-refusal functions, lexical parameter inspection
finds 49 with mutable Value, 14 with Vec and 5 with String; these are prospective
shape labels, not semantic admission. Actual examples are
`account_policy_response::rewrite_value`, `anthropic_nonstream::merge_object`,
`bridge_controls::install_max_tool_calls` and `bridge_request::flush_parts`.
Existing immutable JSON copy/update operations do not supply general IndexMut.

Literal includes are the narrowest source-closure prerequisite to investigate.
Of 209 functions refused for original str/Result/Option/Vec namespace identity,
54 occur in these three unchanged complete sources:

- `rust/src/model_routing.rs`: 23; includes `model_routing_resources.rs`.
- `rust/src/gemini_bridge_request.rs`: 19; includes `gemini_bridge_request_reverse.rs`.
- `rust/src/native_service.rs`: 12; includes resources, target and relay sources.

The retained evidence also includes the native-service test-only includes. A
rule must prove the genuine include macro owner, literal relative path, Cargo
and configuration context, recursive full source/view spans and original
bindings. Unknown owners, dynamic paths, shadowing and unproved configurations
must refuse. Included items provide no authority to skip checking any body.
The namespace worker owns the separate source-only include proposal.

The current unit-matches packet preserves all 564 production Rust files and
Cargo inputs, with its target functions and source-backed namespace prerequisites.
Its application receiving performance remains open. The families here therefore
exclude matches/format/vector/Option support already being developed; no stale
first-refusal count is treated as an absent current implementation.

The bounded archive is
[`20261021_085800_complete-source-audit.json.gz`](../../tools/translation/source-profiles/common-rule-priority/20261021_085800_complete-source-audit.json.gz),
SHA256 `cedf88e59222e3107b1dfac8018f370115ed8201b154739c547b8d0cb57cd70d`,
1,400,275 compressed bytes, 8,972,113 decoded bytes. It retains all 648 original
members of the three full refusal unions, their complete bodies/spans/hashes,
148 whole original/current source pairs, every group/record index, all 2,032
historical source/compiler vectors freshly observed at Root
`2f1ced72ec45d5c5d48a4131fa0e09fe43dfd312`, and all 873 current tracked Rust/Cargo
vectors. The vectors keep changed compiler inputs explicit; they are not a fresh
compiler verdict or a claimed complete new compiler dependency graph.
All selected HTTP/include sources match their retained originals. The full
mutation union retains one changed source, `translation_core/primitives.rs`,
with both complete images; its historical memberships remain historical.
Whole source bytes and Root HEAD were rejoined after the read-only census, and
the gzip was independently decoded to the full original DATA packet.
