# Declined derivation context drafts

For [PR #785](https://github.com/link-assistant/router/pull/785), two bounded
experiments attempted to repair the original Bun derivation deadline. Both
retain the whole original eight-case test file, its assertions and deadlines.
Neither draft is installed.

| Draft | Complete file result | Failing case duration | Original deadline | Peak sampled cgroup bytes |
| --- | --- | --- | --- | --- |
| Operation-local original definition positions | Seven passed, one failed | 5289.30 ms | 5000 ms | 2054492160 |
| Completed immutable DATA freezing at context roots | Seven passed, one failed | 6004.86 ms | 5000 ms | 2050105344 |

The unchanged failing case is `standard-only actual input enables independent
Hash and proved struct Ord` in
`tools/translation/test/builtin-derive-standard-inputs.test.mjs`. Full elapsed
times were 10.188 and 9.891 seconds respectively. Neither invocation reached
the memory guard; their failures are original test deadline failures.
Single observations do not establish repeatable performance improvement.

The [complete evidence](evidence/declined-context-drafts-20261111.json.gz)
retains both entire reversible source drafts, complete logs and resource
receipts, plus both restored production source files. The unused optional
definition-position wrapper was removed. Production builders match commit
`6b6bea916` exactly. The existing reusable DATA helpers and their original
limits are unchanged. No semantic verdict, input budget, deadline or test is
relaxed. These experiments do not establish parity or a green local gate.
