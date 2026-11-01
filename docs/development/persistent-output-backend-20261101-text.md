# Persistent output pure text source checkpoint

Every test, parser, compiler and native oracle remains **UNRUN**. These pure
helpers are a self-contained child checkpoint for the persistent backend draft.
They do not install a logger, implement the pending native opaque wrappers, or
qualify default/whole-host parity. The shared18-URL fixture/oracle is independent
and imports this parser; it remains source-only evidence.

The text module follows the complete actual launcher/logging/login/request-name
owners: ordered known-secret and JSON-escaped-secret replacement, credential
prefix scanning, bearer/JWT scanning, Rust scalar whitespace, ASCII field-name
normalization, field/aggregate redaction and UTF8 truncation. ASCII byte whitespace
excludes vertical-tab, while Rust scalar whitespace includes it and U+0085, and
excludes U+FEFF. Aggregates validate every duplicate value and scalar escape.
The common number domain is exact safe integers; source-feature-qualified general
serde_json numeric parsing remains OPEN. Malformed or unqualified secret aggregates
refuse rather than leak content through the original unquoted-value fallback.
No equivalence is asserted for those refused inputs.

The HTTP(S) parser implements an explicit closed domain: ordinary ASCII DNS,
canonical dotted IPv4, bracketed IPv6, normal encoded paths/query and qualified
userinfo. Shortened/octal/hex IPv4, terminal hex-number DNS, IDNA/Unicode hosts,
backslashes, unknown escaping and malformed authorities refuse before persistence.
A terminal hex label is checked after one trailing-dot removal. The two actual URL
scanners have different delimiters: launcher stops at `]`, so IPv6 candidates in
that lane refuse; operational IPv6 uses lowercase hexword serialization, including
embedded IPv4. General url2.5.8/IDNA and malformed-input native parity remain OPEN.

The pinned [url2.5.8 host source](https://raw.githubusercontent.com/servo/rust-url/v2.5.8/url/src/host.rs)
uses its own IPv6 segment writer and longest zero-run compression. It does not use
std::net IPv6 Display for URL serialization. Its terminal-number check includes
hex/octal numeric parsing, which is why such apparent DNS labels cannot be admitted
as ordinary DNS merely because they contain letters.

The UTC helper uses signed i64 seconds, non-leap system-time nanoseconds, Gregorian
arithmetic and chrono AutoSi3/6/9-digit fractions. It does not substitute JS Date
milliseconds. It supports ordinary RFC3339 four-digit years; leap and other time
sources remain outside this input contract. String-only launcher JSON uses the
ASCII lexical key order of the future source-qualified default serde_json Map;
unknown/preserve_order feature profiles cannot acquire compiler authority from
this standalone function. Event names have an explicit256-byte owned domain.

ExitCode Debug rendering follows Rust1.89's outer derived tuple and actual
[Unix implementation](https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/std/src/sys/process/unix/common.rs)
and [Windows implementation](https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/std/src/sys/process/windows.rs).
These source-selected formats still need the complete independent native cases.
No observed native sysroot, builtin owner, Arguments ABI, logger durability,
OS-lock inheritance, dynamic formatting or application admission is claimed.

Remaining full batch: real persistent provider/lifecycle completion, approved
virtual original-native wrappers, strict declarations, actual filesystem/platform
and native oracle cases, private complete source/feature/domain frame, aggregate
successor/CST/history/assets, whole-owner migration and both edited target inverses.
The complete backend work remains assigned; this checkpoint does not replace it.
