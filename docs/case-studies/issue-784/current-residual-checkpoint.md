# Residual and source-history draft checkpoint

The coordinated batch after published `1c235248` retains the original tests
and deadlines while repairing demonstrated compiler/source-selection defects.
All available failures from that head's complete CI cycle were collected
before publication; the unavailable forward shard-2 log remains an explicit
gap in the [terminal inventory](current-terminal-ci-1c235.md).

The [numeric](current-numeric-record-regression.md),
[standard method](current-standard-record-regression.md) and
[unwrap](current-unwrap-regression.md) repairs preserve enclosing record
bindings across checked original method bodies. Their regressions include
strict TypeScript, before-fix failures, original source execution and retained
resource failures. [Static residual](current-residual-regression.md) checks
prove the genuine error leaf independently of the dynamic success leaf;
dynamic-to-static escapes remain refused. The original lifetime file passes
all nine cases. The [getter](current-getter-regression.md) retains both whole
historical and current production sources; each engine passes nine cases.

[Capabilities](current-capabilities-regression.md) now has separate whole
historical/current cases with unchanged original deadlines. Both local whole
runs hit the memory guard and remain unqualified. The
[Core import correction](current-core-import-regression.md) checks the actual
Schemars dispatcher and all three bindings in both complete sources. Syntax
passes; the unchanged complete producer had hit the guard before the repair,
and the repaired whole execution remains unrun.

The [actual compiler registration](current-residual-registration.md) captures
1,824 current inputs / 57,923,560 bytes. Independent source review and actual
installation reproduce all seven outputs and 468 genuine portable Git objects.
Current complete receiving runs remain unqualified. This batch establishes
zero measured newly executable production functions.

At committed source `b28c5bfe52f8cd2c1a834bf80798e062433e2f3d`, the mandatory
complete local gate was attempted twice with Node 20.20.2, inherited
192 MiB child old-space and 512 MiB gate old-space. TypeScript is the
lockfile-installed 5.9.3. Both attempts stopped during fingerprinting at the
unchanged 2,866,933,760-byte cgroup guard:

| Attempt | Observed seconds | Peak sampled cgroup bytes | Result |
| --- | ---: | ---: | --- |
| Completed-prefix page adviser | 14.929 | 2,871,148,544 | Guard exit 143; every stage unrun |
| Same adviser after inactive tracked-page preflight | 15.179 | 2,877,116,416 | Guard exit 143; every stage unrun |

Both separate advisers exit zero but report incomplete fingerprint coverage.
Preflight advises only closed, single-link, task-owned tracked regular files;
the sampled total changes from 2,603,008,000 to 2,556,854,272 bytes. This is a
cgroup observation, not an exact reclaim measurement. No file, Git object,
global cache or foreign process is removed. All owned children were reaped.
No green stamp is written and no Rust tool runs. Earlier gate stages at a
different source SHA do not qualify this head.

The [complete checkpoint packet](evidence/current-residual-checkpoint.json.gz)
retains every failed stream, observer receipt, complete page-advice receipt,
fresh issue/comment/main observations and complete local review. GitHub's
PR diff endpoint refuses more than 300 files (HTTP 406); the complete local
published and coordinated diffs retain 133,189 and 7,028 lines respectively,
read in batches of at most 1,500 lines. Binary/text blob identities are also
retained. Readback integrity alone grants no semantic authority. The prior
published review copy was retired only after exact published-blob verification;
its [receipt](evidence/current-conversion-review-local-retirement.json.gz)
retains immutable recovery links and the full original identity.

The PR remains draft and unmerged. Complete generation, every original
deadline, current application/receiving checks, strict parity and all privacy
acceptance criteria remain mandatory and unfinished.
