---
kind: fixed
---

Keep the owned facade and range source literals in an import-free data module.
The runtime helpers import and re-export their unchanged public constants; they
still perform all actual source checks. The range migration CLI reads only the
data module and no longer boots a formatting/parser import cycle just to obtain
those literals. This changes no Rust source, runtime operation or admission rule.

The existing whole range suite now starts the actual CLI in a fresh same-engine
process over the four portable complete originals and actual core source tree.
It retains the full child terminal, proposal and emitted source, compares every
proposal against the independent in-process results, checks idempotence and
verifies the source tree remains untouched. Eight whole cases and the existing
60-second case and 20-second strict target limits remain unchanged. All receiving
checks are UNRUN for this source repair; Rust remains CI-only.
