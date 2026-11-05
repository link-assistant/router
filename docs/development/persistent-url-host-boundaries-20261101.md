# Independent persistent URL host boundaries

This is source-only fixture/oracle work. All18 rows and the additional message
boundary assertions are **UNRUN**. No test, interpreter, Rust tool, parser, translator
or compiler was executed locally, and CI feedback remains uninspected.

The independent table is
`rust/tests/fixtures/persistent-url-host-boundaries-20261101.json`. Its actual
native oracle, `rust/tests/oracles/url_host_edges_20261101.rs`, invokes the locked
url2.5.8 crate through Url::parse and compares complete canonical URL strings
or explicit native parse errors. It joins the existing native policy integration
target, with no additional linked binary. Cargo.lock pins2.5.8 and checksum
`ff67a8a4397373c3ef660812acab3268222035010ab8680ec4215f38ba3d0eed`.

The pinned [upstream host source](https://raw.githubusercontent.com/servo/rust-url/v2.5.8/url/src/host.rs)
uses its own IPv6 hex-word writer and longest-zero-run compression; it does not
use a platform address Display formatter. Its ends-in-a-number predicate drops
one trailing dot and checks decimal labels or successful IPv4-number parsing,
including hexadecimal/octal prefixes. Consequently a superficially ordinary
ASCII DNS label ending in0xff can require IPv4 parsing and fail. Such inputs
are explicit refusals in the portable persistent parser's closed domain; names
and JavaScript DNS regular expressions cannot grant native URL equivalence.

`tools/translation/test/persistent-url-host-boundaries-20261101.test.mjs` consumes
the same complete independent table through the actual new pure launcher and
operational URL helper implementations. It asserts each exact output or explicit
PersistentTextDomainError. The test retains60-second case deadlines and is
automatically discovered by the existing complete Node/Bun forward test globs.
No filtering, skip, alternative hand-written implementation or workload reduction
is introduced. Source-only errors found by review are implementation drafting,
not CI feedback repairs or observed test failures.

Native parsing success and translated admission are separate columns. The table
retains native-valid shortened/octal/hex IPv4, Unicode IDNA and backslash inputs
as target-domain refusals. Ordinary DNS/IP and exact percent-decoded query names
have literal paired expectations. Operational IPv6, including mapped IPv4 tails,
uses the native hex serializer; launcher IPv6 refuses because its real candidate
scanner terminates at the closing bracket before a complete URL can be parsed.
When native helper logic makes no change, original candidate spelling remains
exact even if a URL parser would canonicalize it. Query removal, default ports,
dot path segments, duplicate secret query keys, form encoding and trailing
message text have independently authored exact expectations.

This pure-helper test does not issue source/type/producer authority, qualify a
compiled target, install the copied persistent profile, prove general URL/IDNA
coverage or establish native logger parity. The worker's complete persistent
backend/profile/whole-native/strict-TS receiving cases remain independent.
Actual native URL parsing and portable helper behavior require later execution
evidence; all original8 same-SHA JavaScript gates must pass before fatal Rust
CI. O01/O04/O05/B03/F03/V03/T01/T02/E03/Q02 remain OPEN for full clauses.
