# Native Buffer callback domain repair

The complete Core transport exposed two narrower codec defects. Above the
1 MiB byte index bound, Node's `Buffer.from(callerBuffer)` observes an own
`valueOf` getter that native Buffer JSON ignores. A changed backing-store
prototype also reaches that conversion fallback. Bun's native Buffer JSON
observes an own `Symbol.iterator` override; accepting it without observing it
does not describe a closed callback-free domain across both runtimes.

Two permanent regressions cover both sides of the original bound, offset views,
changed storage, conversion getters, and accessor/function iterator overrides.
They compare every decoded byte and the complete native JSON observation, and
assert that no caller getter runs. Before the repair the complete five-case
file has two Node failures and one Bun failure. The existing three cases pass.

The ordered source rules retain the checked native view when available and
otherwise copy genuine typed-array internal bytes into a private view before
Buffer conversion. Own iterator overrides refuse without invocation. The
original encoder, one MiB index bound, all memory bounds, case deadlines and
Core child deadlines remain unchanged. The actual source producer supplies
both serialized/reparsed CST phases, the complete original inverse and fresh
TypeScript 5.9.3 native binding checks. An independent replay and Node/Bun
syntax checks retain the complete before/after sources. The generated codec
SHA-256 is `15af2bcca63a66c539ea334faedc4d1d71f3941a955522b4c9226059f583f803`.

After installation, all 18 cases in four complete codec/source-contract files
pass in Node 20.20.2 and Bun 1.4.4. Node's independent source/deadline audit
passes; Bun durations also satisfy the original 60000 ms case limits. The
complete Core file separately passes all assertions in both engines. Its Node
source-validation case takes 75575.721335 ms against its original 60000 ms
limit, so its independent audit fails. Bun passes all six original cases. The
12500 ms child limits and complete JSON/Hash observations remain checked.
None of these results establishes full Core performance qualification.

The review script joins every Node source hash/call span/deadline with the
complete Bun reports. The evidence packet retains all before/after reports,
resource receipts, Node audit directories, full producer proposal and original
sources. It also preserves an incorrect initial producer invocation and a
review-script author error, followed by the corrected successful checks. No
run reaches the container memory guard. The source fix adds zero executable
production functions; strict parity, canonical generation, profile matrices,
the complete JavaScript gate and universal privacy criteria remain unfinished.

The [55-member complete evidence packet](evidence/native-buffer-callback-domain-20261110.tar.gz)
has SHA-256 `c938f2f58d6bd67c0460fef365e03239ac4c19fa237e6926510f31c55332a4ed`.
Every member was read back and hashed before retiring only inactive duplicate
raw files and audit directories. Its separate compressed receipt retains the
full receiving review and member inventory. This is local repair evidence for
[PR #785](https://github.com/link-assistant/router/pull/785).
