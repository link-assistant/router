# Original named lifetimes and condition parsing

At clean `43e478789d6f74f1e756c97226cbe283dd413827`, all **158 cases
across 24 files** pass in both engines: Node 20.19.4 in **51.107 seconds**,
Bun 1.4.3 in **32.605 seconds**, with no failures, skips or timeouts. The final
1,424 compiler inputs share SHA256
`0e016b684d51ab4586d5bd3ba5ae756a7762b7175545c8131a6bcb6d134f567b`.
Target cases execute generated JavaScript and independently strict-compiled
TypeScript from the same checked meta representation.

Fourteen named-lifetime cases cover exact original binders, shared str/fixed
pointees, nested Option/products, input lifetime meets at calls, local and
return borrow constraints, source namespace shadows, sealed binder metadata,
reserved names, weak contextual names and quote/name adjacency. Static tokens
require the same adjacency; whitespace before the apostrophe remains valid.
The existing pinned Rust 1.89 identifier source supplies the keyword selection;
no manually maintained keyword table or rewritten lifetime source is used.

The complete unchanged canonical_openai_model declaration retains source SHA256
`1eafa26a131345dc3ce171a3ec1cc6833a801a794ecc76d545bca3d96eacf09c`,
item span 146..574 and SHA256
`69c0ed38eea80cf9a018362cdef6bc1414fd31b6da8c09b3cc078b4632207574`.
This fixture verifies complete syntax preservation. Provider trait dispatch and
full original graph execution remain independent obligations.

The initial 23-file batch passed 150/154 in both engines (49.658/31.826 seconds).
Its four failures are preserved: a checked-envelope fixture read error, two
older negatives that expected newly supported valid named functions to fail,
and a real parser error that consumed an enum value before an if-block as a
record literal. Fixtures now read the canonical checked program and retain
actual named escape/coercion negatives. The original complete body stays intact.

Eight exact adapter anchors propagate only the record-expression exclusion
through binary/unary operands; Host/Text wrappers retain the same context.
The expanded first retry passed 157/158 in both engines (52.516/32.428 seconds).
Its remaining unchanged assertion exposed the tuple frontend forwarding outer
condition flags inside explicit parentheses. Resetting group/tuple elements
to the ordinary delimiter context matches the vendor parser. Four new cases
check generated behavior, records in parentheses/call arguments, both tuple
positions, enum syntax with unproved equality still refused, and invalid
unparenthesized records. Vendor bytes and body/type collection hooks are intact.

The [receipt](router-759-current-named-lifetimes-43e47878-receipt.json) identifies
all six attempts and the [complete archive](router-759-current-named-lifetimes-43e47878.tar.gz):
352,820 bytes, SHA256
`534c96f2cbd562327a4ea7ae673030ed65d32f80293058a8e97644a95d5e96ad`.
All 21 members reopen with zero errors. Three exact-content hardlinks retain
the paired input manifests efficiently. The pack contains both exact
focused helpers, archive helper, every full raw log/receipt and all input hashes.

Final owned-child maximum RSS was 209,469,440 bytes in Node and 334,888,960 in Bun.
This includes terminated helper children; it is not an aggregate process-tree
peak or physical footprint. Host load and caches were uncontrolled, so the
recorded elapsed times establish no controlled performance improvement.

This batch ran no canonical/profile producer, complete JavaScript gate or Rust
build. No full-corpus gain, complete native parity or cleared strict gap is
claimed. Type/const generics, outlives bounds, mutable references, unproved
traits and undeclared lifetime names remain refused. Rust CI/CD stays blocked
until the complete JavaScript gate passes.
