# Complete local gate at 5f8c1d889

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
Both complete gate invocations used source
`5f8c1d88983a49f0a5f3be57864b96182e9a4f9e`, Node 20.20.2, a 512 MiB
old-space limit, the installed TypeScript 5.9.3 and local Bun 1.4.4. CI's
Bun pin is 1.4.3. Neither invocation passed or wrote a green stamp.

The first attempt stopped at the unchanged container memory guard after
26.632005 seconds: 2870947840 sampled bytes against the 2866933760-byte
guard and 3135369216-byte container limit. Initial input fingerprinting was
incomplete; every gate stage was unrun. The stopped child and reaper exited.

The second attempt additionally advised completed fingerprint file pages.
It did not pause clocks, change source, remove files or change gate commands.
The complete initial fingerprint covered 52034 files and 1795380114 bytes.
The memory guard stopped this invocation after 708.159533 seconds, at a
sampled peak of 2878119936 bytes. All nine stopped owned processes, their
reaper and the completed page adviser were verified absent afterward.

| Mandatory work | Second attempt |
| --- | --- |
| All ten lint commands | Passed |
| Complete native Node suite | 260 passed; 48.540244 seconds |
| Complete native Bun suite | 260 passed; 80.982579 seconds |
| Complete deadline-auditor controls | Ten passed; 16.357361 seconds |
| Public and native strict TypeScript | Passed |
| Native TypeScript regeneration freshness | Passed; 11591744 bytes, no changed or unexpected artifacts |
| Strict generated native TypeScript | Passed; 167 files, 15.224147 seconds |
| Original nine-case native TypeScript test file | Interrupted; four passing cases reported, no final deadline audit |
| Remaining nine TypeScript commands | Unrun |
| Parity, forward translation and reverse stages | Unrun |
| Final fingerprint and green stamp | Unrun / absent |

The interrupted file's missing `case-deadlines.json` caused an ENOENT during
wrapper shutdown. Buffered TAP does not identify which case was executing
at interruption. Its four printed assertions do not qualify the full file.
Three negative auditor fixtures deliberately reject computed options,
prototype-initialized options and an 83.013598 ms synchronous case with a
10 ms deadline. Their failures are expected controls; the complete ten-case
outer auditor file passes. They are separate from the interrupted file.

The [complete archive](evidence/current-5f8-complete-gate.tar.gz) retains
both raw gate streams, resource receipts, page-advice records, all twelve
audit directories and the relevant original source files. All 95 members
were independently read back and hashed. Its 1536004 bytes have SHA-256
`fcc36b1fc4a9b688b2dc4df5ed10ca373366cf6c70b1cb9c8c9dc453b942cb1a`.
The [receipt](evidence/current-5f8-complete-gate.json.gz) records complete
command observations and each audit's outcome. Only verified inactive audit
duplicates were then retired: 2907414 logical and 3055616 allocated bytes.
Task evidence remained below 500 MB. No Rust tool ran.

These attempts do not supersede the [terminal published CI failures](ci-0e234-terminal-20261111.md)
or qualify any unrun stage. Original deadlines, strict parity, complete
generation, same-SHA CI and the remaining privacy criteria stay unfinished.
