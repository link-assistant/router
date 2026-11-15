# Static source archive compression

Draft repair for [PR #785](https://github.com/link-assistant/router/pull/785).
The installed complete static source archive used gzip level 1 and occupied
5,175,931 bytes. Export correctly refused it against the original 4,194,304-byte
per-file bound. This also prevented the receiving workflow, offline compiler
export and relocated compiler tests from reaching their actual workloads.

The authored producer now uses level 9. The existing public source producers
regenerate its allocation variant and strict sibling through complete native
source copies, both serialized/reparsed CST phases and exact source inverses.
The allocation generator accepts only its exact prior copied compression line;
the strict generator accepts its complete pinned previous output. Complete
[release](evidence/current-static-compression-release-source.json.gz) and
[strict](evidence/current-static-compression-strict-source.json.gz) plans precede
installation. This is an archive storage change, with every original source,
logical digest, historical universe and limit preserved.

The explicit lossless repack first runs the complete original native source/CST
reader and layout encoder. It confirms their entire stored byte image matches
the installed archive before applying the separate repository compression rule.
The result occupies **4,135,656 bytes**. Its 20,935,747 decoded storage bytes and
74,074,214 logical JSON bytes retain the original digests. Only the manifest's
compressed byte count and digest change. The
[complete compression receipt](evidence/current-static-archive-compression.json.gz)
also identifies the complete previous archive in immutable Git history.

Node 20.20.2 with installed TypeScript 5.9.3 completes all 20 cases in the three
whole existing storage, allocation and strict-refresh files. The former export
failure passes, including its complete exported source census. Verification
still **fails**: the independent audit catches 163,665.854657 ms for the pair
of full producers and 62,052.671828 ms for the complete bank storage case,
against each original 60,000 ms deadline. All other cases stay within their
declared limits. The observer records 342.169316 seconds and a sampled total
cgroup peak of 2,694,905,856 bytes. No timeout, test selection, source check or
export limit was relaxed. Bun has not been run for this repair.

The [12-member complete check archive](evidence/current-static-compression-checks.tar.gz)
and [receipt](evidence/current-static-compression-checks.json.gz) retain source
capture, repack, all raw Node streams and the full failed independent deadline
audit. This fixes the concrete archive refusal while leaving those performance
failures, strict parity, freshness, profile matrices and the complete local gate
unfinished. No additional executable production function is claimed. No Rust
tool was invoked.
