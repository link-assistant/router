# Single-validation String-vector join kernel draft

The additive JS runtime kernel validates a frozen ordinary dense String vector
and scalar separator once, preflights exact UTF8 output bytes, then calls the
captured ordinary Array join implementation. The vector remains shared and
unchanged. It accepts at most 4,096 elements and 1 MiB UTF8 input/final output,
including a checked separator for an empty vector. A scalar byte counter rejects
unpaired surrogates and UTF16/UTF8 overflow before output allocation. Descriptor
checks reject proxies, getters, holes, foreign prototypes and additional fields.
No value, source, hash, owner, verdict, result or failure cache crosses calls;
there is no scoped value cache either. The code is designed to avoid repeated
whole-vector and accumulated-prefix validation; measured performance is UNRUN.

Strict declarations use the existing readonly String-vector abstraction. Four
fresh physical inputs cover the runtime, declaration, complete original Rust
fold/JS/TS helper producer and full expected source/ABI contracts. The original
failure-aware pinned reader is copied completely, retaining closing reads,
CST/inverses, source-host guards, per-operation revocation, nesting limits and
original APIs/refusals. The observer checks the entire JS body/declaration and
actual native helper signature/body/CST, plus the existing len/get ABI. Receiving
checks additionally require original native/runtime text sources and every
kernel mirror; a caller's overridden Map.get cannot replace actual text data.
Only the operation-local source frame may share these fresh observations.

The native lowering remains the complete checked same-module fold helper;
there is no ninth native core ABI or new native root edge. Complete input/source
matching is observation DATA, never an original type, namespace, move, loan or
caller permit. Public mutation cannot change immutable cached source records.
The receiving asset API supplies the paired runtime and declaration alongside
existing vector/literal assets; compiler helper/catalog inputs are not installed
as application runtime modules. Existing private compiler APIs remain exact.

Independent runtime Unicode/NUL/scalar, full-capacity 4,096-element/1 MiB UTF8,
raw synchronous 60-second deadline, descriptor/proxy/refusal, four-input pin/CST/
symlink/closing, complete receiving/native/text/mirror, observation mutation,
caught-failure revocation and strict TS cases are drafted. The existing complete
native standard-library oracle source gains matching full-capacity cases.
All are UNRUN. No tests, benchmark, parser/translator/preparer/compiler or trial
execution occurred locally, and CI/review feedback remains uninspected.

Compiler caller mapping, emitters, interpreters and canonical inverse now have
[complete additive source profiles](owned-text-vector-join-callers-source-draft.md).
[Automatic kernel adoption](owned-text-vector-kernel-adoption-source-draft.md)
also has explicit direct/composed/discovery/paired paths. Original fold APIs
remain unchanged. All these new paths are UNRUN; they establish no receiving or
performance result. Original whole-Rust project forward recognition, body/
namespace/owner qualification, freshness, every platform, production parity and
full synchronization remain OPEN.
