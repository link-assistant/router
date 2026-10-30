# Whole local resource helper source draft

All new implementation, receiving and native case source remains unrun.

The caller checker now collects actual direct local call edges from the entire
native-parsed source module. A bounded dependency traversal checks complete
callees before callers, preserving original source order for emitted functions.
Each helper descriptor is derived from that whole checked function's actual
input domains, return type, cold future status and returned source roots. A
signature table alone cannot qualify an unchecked body.

Private descriptor and call-binding tables live only within one fresh analysis.
Each checked descriptor is added once; whole-meta reanalysis reconstructs them
from source. No source, owner or verdict cache spans invocations. Actual imported
bindings and local helper names use distinct lookup routes, including when a
local helper name equals an imported operation's original exported name.

Calls retain all existing argument moves/reborrows, Result/Option guards,
cleanup, nested errors, source roots and immediate cold/await boundaries. A
single original returned helper root maps to the actual caller argument. Local
helpers that release resource inputs or return multiple roots retain explicit
call refusals until their complete interprocedural state/loan joins exist.
Recursive/mutual calls also retain explicit signature/effect obligations.

The canonical inverse reads complete native helper signatures as source DATA,
proposes local calls, then independently checks the whole JS module. Native
signature parsing does not grant a type or owner permit. Exact full native
reproduction remains mandatory. Wider numeric, generic, alias and ownership
signatures keep their original refusals.

Full original flow/source adapter/emitter/projection copies and ordered native
substitution recipes retain complete originals and CST inverses. Independent
source cases cover later-declared helpers, original order, string roots,
Options, cold deadline forwarding, same-spelled import/local bindings, forged
meta, recursive/unknown/releasing/multiple-root refusals, canonical whole-module
reproduction and actual JS plus independent strict TS. Handwritten native source
provides a separate behavior oracle reserved for gated CI.

Recursive/generic/method calls, release and multiple-root helper joins, broader
loops/state/async domains, source namespace closure, production adoption, full
receiving/CI repairs and every other unfinished requirement remain open. No
translator, preparer, installer or test was run.
