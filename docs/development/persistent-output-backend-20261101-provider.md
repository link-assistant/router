# Persistent logging provider source boundary

SOURCE DRAFT, UNRUN. The provider and native leaf are not installed compiler
sources. This is a real synchronous filesystem/OS-lock implementation over the
existing configured Python3 dependency, not a logging callback mock. Complete
receiving/native/platform evidence remains required before any parity claim.

The native facade delegates the original launcher `DiagnosticLog`, ACTIVE scope,
original operational global LOG, actual RecordWriter Drop and process install.
It neither copies globals nor translates standard library internals. Logger
initialization, configuration and writer scopes are explicit library setup;
only the existing genuinely checked qualified static-literal application output
family is proposed for translation. General higher-order setup, dynamic
formatting, async task propagation and tracing producers remain OPEN.

The operational provider retains the original opened lock FILE in its parent
process and passes a duplicate descriptor to each blocking transaction; it locks
and unlocks per record. Launcher transactions open their lock per record and
release by drop. Operational append failure takes precedence over unlock failure.
Private directory/file modes, symlink refusals, rotation counts/order and
close-on-unwind are explicit implementation steps. There are no hidden deadlines
or lock expiry files. Python startup/control failure is infrastructure failure,
never fabricated native IO success or a guessed native OS error.

## Versioned source joins

The actual CI-selected Rust version reported by the coordinator is 1.98.1; no CI
status/log/artifact was inspected. Relevant source was read directly from that
release. [Unix File::datasync](https://github.com/rust-lang/rust/blob/1.98.1/library/std/src/sys/fs/unix.rs#L1338)
uses interruption retry and selects Apple F_FULLFSYNC, listed Unix fdatasync,
otherwise fsync. [Windows File::datasync](https://github.com/rust-lang/rust/blob/1.98.1/library/std/src/sys/fs/windows.rs#L377)
delegates FlushFileBuffers. The kernel calls these respective real APIs; Darwin
without the required command refuses rather than silently substituting fsync.

[Unix ExitCode](https://github.com/rust-lang/rust/blob/1.98.1/library/std/src/sys/process/unix/common.rs#L537)
retains its u8 status and custom debug tuple;
[Windows ExitCode](https://github.com/rust-lang/rust/blob/1.98.1/library/std/src/sys/process/windows.rs#L747)
retains its derived u32 debug tuple. The older committed 1.89 source snapshots
remain byte-exact historical evidence, not qualification for the newer version.
Unsupported targets remain refused. Complete native expectations are CI-only.

[fs2 0.4.3 Unix](https://docs.rs/fs2/0.4.3/src/fs2/unix.rs.html)
calls libc flock without Python's newer automatic interruption retry; this
provider likewise makes one libc call. The
[Windows implementation](https://github.com/danburkert/fs2-rs/blob/0.4.3/src/windows.rs)
uses exclusive blocking LockFileEx and the full two-word range. Numeric descriptor
sharing is documented by [Node 20.19](https://nodejs.org/download/release/v20.19.0/docs/api/child_process.html#optionsstdio).
The [Bun 1.4.3 bridge source](https://github.com/oven-sh/bun/blob/bun-v1.4.3/src/js/node/child_process.ts)
is a versioned provider dependency, not proof that Python CRT fd3 maps correctly
on Windows. Receiving probes must establish exact parent/child FILE identity;
unmapped descriptors fail infrastructure. No Windows host parity is claimed.

## Closed domains and remaining work

Common HTTP(S) URLs have an explicit successful domain. Full url2.5.8/IDNA,
non-safe-integer JSON semantics and native feature/source closure remain OPEN.
Unsupported sanitizer inputs fail before raw-output fallback. The actual native
URL parser remains the independent oracle, including inputs refused by this
portable subset. Native source identity and source/CST restoration grant no
permission to treat refused inputs as equivalent.

Raw process environment provenance is not established by scalar-valid JavaScript
alone. Both owned sides restrict ingress before logger IO: no invalid native
encoding, replacement scalar, numeric name or aliased/special key; Windows keys
are ASCII in this domain. The provider checks complete parent-before, child and
parent-after rows/order. Arbitrary original vars_os lossy encoding, Node/Bun raw
key conversion and Windows special environment blocks remain OPEN; no public
verified flag grants entry. Context environment retains its original native
precedence and native BTree ordering in the admitted ASCII-key context domain.
Unicode context keys remain refused on both owned sides; Unicode scalar values
are preserved. Native OsString/WTF8 ordering is not approximated by JS UTF16. Unsupported environment is an explicit
owned ingress refusal, not a changed claim about the original logger.

Ordinary lexical absolute paths exclude dot components/repeated separators and
Windows mixed separators. Pathname equivalence alone does not establish exact
native error display spelling. POSIX transport errors require genuine numeric
errno and actual provider strerror; raw Win32 transport error identity remains
unqualified. Locale, interruption, descriptor inheritance, concurrent rotation,
IO failure and lifecycle cases remain complete independent receiving/native
obligations. No measured memory/performance or whole-host/default parity result
is claimed.

The exact native process installer also initializes tracing_subscriber's global
registry, reloadable EnvFilter and runtime_debug CONTROL. General subscriber
conflict, tracing formatter/filter/reload/TTL and foreign producer interoperation
are OPEN target requirements, not implemented by the explicit logger/writer
API. Native calls retain the real original installer and its try_init failure.
A fresh controlled receiving process with only the qualified output callers is
the positive shared domain; no submitted registry flag can grant broader entry.
