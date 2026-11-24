# Explicit private parser DATA assignment candidate

`prepare-private-parser-assignment-data-candidate.mjs` retains the entire current
executor as a prefix of a separate candidate. Installed TypeScript 5.9.3 native
symbols select the actual `data` recursion, complete `execute` calls and complete
`lexPrivateConcreteSources` calls. Separately declared language and repository
CST substitutions serialize/reparse the whole output and restore the complete
original source in the inverse. Native copied-source binding review and a final
fresh whole-input hash are mandatory. No generated output is hand-edited.

The copied `assignmentData` changes only property creation. An absent ordinary
key uses `result[key]=...`; every inherited key, plus `__proto__` and `get`, keeps
the original `Object.defineProperty` call with a null-prototype descriptor. The
`in` operation reads no getter: its target is a freshly created ordinary object
or array with the exact prototype ancestry already qualified by `checked`.
There is no source/owner/descriptor/verdict cache or stored key census.

Special-casing only `__proto__` and `get` would be insufficient. The current
bootstrap can accept an inherited native method with a nonwritable descriptor.
Direct assignment could throw where original own-property definition succeeds.
The complete inherited-key fallback handles this accepted domain, including a
cold native nonwritable `Object.prototype.toString` or `Array.prototype.map`.
It also keeps tolerated inherited `Object.prototype.get` unobserved.

The original `data`, `execute`, all original exported functions, source packet
authentication, every original crypto payload, independent SHA, source reads,
before/after full-source comparisons, final file identities, transaction
associations, recursion guard, class/proxy/accessor/function/symbol refusals,
16,777,216-cell and depth-256 budgets remain in the complete copied executor.
Copied operations share that executor's existing private compilation state;
the candidate adds no second compilation or retained verdict within a module.

The explicit `private-parser-assignment-data.mjs` facade maps the three original
recipe/scalar-lexical/batched-lexical API names onto the copied candidate routes.
Other APIs remain their existing complete implementations. Original default
imports keep using `private-parser-execution.mjs`. The source audit found no
`data` call in serialized CST transport paths: this candidate targets token and
recipe copying, not all parser work. Profile observations motivate the trial,
but no speed improvement is measured or claimed.

Root can materialize with the installed actual Node engine and existing bounds:

```sh
node --max-old-space-size=2048 tools/translation/prepare-private-parser-assignment-data-candidate.mjs --write
node --max-old-space-size=2048 tools/translation/prepare-private-parser-assignment-data-candidate.mjs --check
```

The new complete receiving file has six original-deadline cases. Its test-only
whole-source/CST/inverse seam calls the two actual private copiers under their
original checks; it grants no source authority. It compares full descriptors,
prototypes, sparse arrays, null-prototype objects, special keys, primitive
values, every refusal class, depth and actual small-budget decrement behavior.
The warm source-hash mutation case explicitly performs initial complete lexical
operations, then retains every observed Hash argument while a genuine Hash
callback installs an inherited setter; both operations must refuse without
calling that setter. Cold independent children cover native nonwritable keys.

Before adoption, receive that whole file under Node and Bun and retain complete
original parser execution, ingress, common-intrinsic, expected-descriptor,
batched-descriptor and SHA test files. An isolated native/CST import overlay can
route their static executor imports to the explicit facade while preserving
each complete original test body and its deadline. Their historical source
fixtures still exercise their stated original sources; an unchanged original
default run alone does not establish candidate behavior. Any later production
proposal should copy the actual new helper into the original module and route
its actual native-bound calls, preserving old `data` and one existing compiler
state, after complete receiving qualification.

This batch is source-only. Materialization, all six new cases, complete old-file
overlays, strict checks and performance workloads are **unrun**. The separately
qualified observer helper/Core cases do not qualify this candidate. Default
original twelve-case Node/Bun performance remains red.
