# Original unwrap bodies preserve surrounding record fields

The pinned Option unwrap checker also started a fresh temporary-name supply
inside the caller. A whole-file regression failed its strict TypeScript child
before the repair. The original `unwrap_or`, `unwrap_or_default` and
`unwrap_or_else` body now uses the existing callback environment, keeping local
return/control boundaries while sharing the enclosing function's name supply.
Original source selection, independent semantic rechecking and private proof
requirements remain in force.

The added case checks eager, lazy and Default specialization with absent and
present values, integer boundaries, mixed boolean/integer fields and nested
records. The earlier record regression remains complete and unchanged.

| Complete file | Result | Seconds | Peak sampled cgroup bytes |
| --- | --- | ---: | ---: |
| Record file before repair, Node | 1 passed, 1 failed | 8.269 | 2,532,917,248 |
| Record file after repair, Node | 2 passed; deadline audit passed | 6.539 | 2,519,482,368 |
| Record file after repair, Bun | 2 passed | 5.338 | 2,506,182,656 |
| Original standard-body source file, Node | 15 passed; deadline audit passed | 26.233 | 2,560,176,128 |
| Original standard-body source file, Bun | 15 passed | 17.780 | 2,560,307,200 |

Node 20.20.2, Bun 1.4.4 and lockfile-installed TypeScript 5.9.3 were used.
All original deadlines and whole files are preserved. The existing source
file also checks eager effects, aliases, unsupported owners and lifetimes,
forged proofs, fresh-process reconstruction and borrowed/owned strings.

The [complete evidence packet](evidence/current-unwrap-regression.json.gz)
retains original/current checker bytes, whole test files, every before/after
stream, resource receipts and complete independent Node audit directories.
Every decoded member was checked for length and SHA256. These focused passes
establish no current generation, receiving qualification, strict parity,
full-gate result or newly executable production function. Rust was not run.
