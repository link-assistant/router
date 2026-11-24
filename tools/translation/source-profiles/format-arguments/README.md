Portable source-only formatting stage inputs

This profile is intended for reusable automatic macro/compiler lowering, with
complete original sources and private byte verification. It augments the
existing checked primitive formatter; it does not duplicate that runtime or
authorize same-spelled source macros.

format_source_profiles loads and checks each available original input, retaining
an explicit diagnostic and false completeness when a required input is absent.
format_source_meta mechanically retains macro attributes/source scopes and
function signatures/body tokens/call edges. format_argument_source_plan retains
original invocation arguments and explicit source order, then expands actual
ordinary source wrappers through the generic declarative engine. It refuses
compiler-builtin comment-body expansion. No generated compiler AST, formatting
trait call, memory allocator or stdout/stderr implementation is synthesized.

Current sources do not close std/alloc export aliases, builtin registration and
ExtCtxt AST owners, rustc_parse_format integer/Unicode/lifetime dependencies,
HIR fmt::Arguments lowering/optimizers, formatting trait implementations,
allocation/OOM/Drop or I/O effects. All semantic/runtime/native authority remains
false. Tests are authored separately and initially UNRUN.

The next source-backed bridge adds format-builtin-dataflow.mjs and
format-checked-source-bridge.mjs. The former derives a private symbolic tail-call
plan directly from a complete original callback body and retains the target's
original branches, bindings, operand token trees and source hashes. Substitution
accepts opaque input descriptors and never executes compiler callbacks. Generic
registration extraction retains original nested macro definitions, invocation
entries and enclosing resolver bodies; unsupported expression callbacks remain
opaque. Neither callback module identity nor macro expansion is inferred from
a source filename or callback spelling.

The bridge invokes the existing translateSource pipeline unchanged, including
its actual lexical macro guards. It associates existing checked primitive
formatProvenance with the exact original invocation/template spans and written
argument syntax. It accepts no caller source scope, macro proof or checked IR.
It creates no additional executable declaration and does not turn borrowed
fmt::Arguments into an owned String. Source-meta clones and foreign private
stages are denied. Seven added cases and the prior five source-stage cases are
UNRUN pending the publisher's explicit compiler grant. No trait, allocator, I/O,
namespace, complete compiler or runtime-parity authority is granted.

Required peer input remains the exact builtin-derive-bang registration archive
listed in manifest.json. Its absence is an explicit input diagnostic, not an
optional proof skip. After integration, registration/callback extraction must
still close actual owner and compiler AST/lowering obligations before it can
justify a new builtin frontend admission.
