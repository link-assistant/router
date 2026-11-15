# Private compiler AST lifetime

[PR #785](https://github.com/link-assistant/router/pull/785) now derives a
private function containing every original compiler-selection prefix statement.
It returns the same source strings, byte buffer and compiler metadata; native
AST nodes and candidate arrays stay local. The receiving producer then runs
its unchanged complete source equations and source/hash checks. The owning
generator retains the complete previous indexed output and its CST inverse;
the generated current producer was installed through that generator.

Both complete two-case source controls pass: Node 20.20.2 takes 4.642 seconds
observed with a peak sampled cgroup use of 2,386,051,072 bytes; Bun 1.4.4
`--smol` takes 3.927 seconds with a peak of 2,393,346,048 bytes. They verify
every copied statement, the complete unchanged suffix, native bindings, source
and CST inverses, and refusals for changed scopes, escaping native bindings,
malformed source and a changed compiler version. TypeScript remains 5.9.3.

The unchanged complete current-consumer receiving file passes under Node:
41,520.078 ms case duration under its original 60,000 ms deadline, 42.267
seconds observed, peak 2,480,959,488 bytes. The analogous whole Bun run reaches
the unchanged cgroup guard after 37.259 seconds (peak 2,874,601,472 bytes,
exit 143). It has no complete case report and remains **unqualified**.

The unchanged whole four-case ASCII file completes under Node with four TAP
passes, but its independent original-deadline audit **fails**: the selected
producer case takes 93,434.117 ms against 60,000 ms. The observer records
95.713 seconds and peak 2,699,669,504 bytes without reaching its guard. This
does not qualify a performance repair. Source tracing remains default-off;
this diagnostic run explicitly enables it. A repeated identical Bun ASCII
attempt was not run. All original deadlines and complete test bodies remain.

The [whole receiving packet](evidence/current-runtime-compiler-lifetime.json.gz)
retains before/after sources, every complete report and resource receipt, and
the independent successful and failed Node deadline receipts. This unpublished
source checkpoint has no fresh complete gate or current registration. Newly
executable production functions remain **0**; runtime parity remains false.
