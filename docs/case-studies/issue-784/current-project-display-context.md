# Project Display analysis contexts

Draft repair for [PR #785](https://github.com/link-assistant/router/pull/785).
The project parser now uses an enclosing namespace context, while original impl
methods require a separately checked complete context. Display admission still
required those two objects to be identical and refused genuine project methods.
The complete original Display file reproduced four failures before this repair.

One project analysis now captures its original module snapshot before creating
either context. Its complete method context is constructed lazily from the same
inputs and privately associated with the parser context. Display accepts that
specific association after validating the original caller and method facts.
Separate analyses, ordinary separately constructed contexts, copies, proxies and
changed private parser facts remain refused. The association supplies no source,
type or execution authority. Original constructors and all exact member, owner,
span, body, profile and checked semantic declaration checks remain mandatory.

Three ordered repository substitutions generate the actual project source. The
fifth receiving history layer preserves the previous four layers, exact inverses,
both serialized/reparsed CST phases and independent native source checks.
The [complete source plan](evidence/current-project-matches-analysis-source.json.gz)
was retained and read back before installation (1,784,487 compressed bytes).

Using installed TypeScript 5.9.3 and Node 20.20.2, all seven complete files pass:
43 completed cases, including 12 finite deadlines, with zero deadline breaches,
missing observations or auditor errors. The observer records 306.132437 seconds
and a sampled total cgroup peak of 2,440,867,840 bytes. Coverage includes the
actual ClientKind and SubscriptionProvider Display methods, namespace aliases,
ValueEnum, project source history and the large Clone refusal regression.

Bun 1.4.4 completes the same 43 cases with 36 passes and seven failures under its
unchanged five-second default. That run is failed evidence, not a Bun validation
pass; its observer records 176.154865 seconds and 2,274,177,024 sampled cgroup
bytes. No timeout or file selection was relaxed. The
[28-member final check archive](evidence/current-display-context-final-checks.tar.gz)
and [receipt](evidence/current-display-context-final-checks.json.gz) preserve
the reproducing failures, corrected whole Node run, complete audits, failed Bun
run and an earlier invalid command selecting a nonexistent test file. The
[initial check archive](evidence/current-display-context-first-checks.tar.gz)
also retains the first new fixture failures and complete source snapshot; these
were corrected before the final Node run.

The complete local gate remains unrun for this tree. Strict parity, generated
freshness, matrices, production performance and universal tool/account privacy
requirements remain unfinished. No Rust tool was invoked and no additional
production executable function count is claimed from these focused checks.
