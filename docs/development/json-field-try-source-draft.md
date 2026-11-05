# JSON Option Try-chain source draft

Implementation and independent case SOURCE is drafted and entirely UNRUN. Full
translation, production coverage, parity, synchronization, freshness and receiving
qualification remain unfinished. No local test, parser, translator, preparer,
generator or compiler was executed, and CI feedback was not inspected.

Common get(key)?.as_str()? and matching bool/u64/i64 forms reuse the existing
field/scalar abstractions. Bounded string-key get chains and canonical object
views may combine through depth four when the original function has a written
standard Option result and every combined successor also ends in Try. Only
literal or immutable unshadowed shared key-input reads qualify. The actual final
question mark remains in its original outer source position; only interior pure
read failures are combined. Missing/wrong-kind remains None, with false/zero/
full-width integers, string identity and receiver-root borrowing preserved.

Never fuse a later getter or scalar conversion lacking its own question mark.
That successor may produce a local None followed by later effects; introducing
an early return would change behavior. Unknown key expressions, non-Option
outputs, competing bindings and other residual/trait domains remain unselected.
Source metadata explicitly retains original FromResidual authority false and
whole-function source/type/ownership checks remain mandatory.

The shared finite call reader also projects a written trailing question mark
from an existing Option field result into its lexical payload role. The source
question mark is retained verbatim. Text rules can therefore normalize subsequent
borrowed methods and owned string copies, including chronological locals, without
inventing an Option default, changing the native API or caching a prior verdict.

Four full compiler source equations retain language then repository phases,
serialized/reparsed CST, all original source inverses and preceding histories.
Independent unrun source covers both adopters, ten actual Try caller forms,
early-return versus later effects, wrong domains and unproved keys, actual
field/text stages, emitted JS and strict TS, reverse borrowed None control flow,
both interpreters, native source inverses, pointer/native behavior and exports.
No native library ABI changed. All eight same-SHA JavaScript gates before fatal
CI-only Rust remain unchanged. Every broader ledger requirement remains open.
