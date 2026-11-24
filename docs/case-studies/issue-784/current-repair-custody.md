# Complete repair observation custody

The [current repair custody manifest](evidence/current-repair-custody/manifest.json)
records 43 inode-preserving moves of 718,017 existing bytes. These include full
cleanup receipts, the owned planner's command/resource observations, the earlier
native test logs, and the full inactive-page-cache diagnostic. Each complete
before/after length and SHA256 was checked. The original empty owned progress
file remains empty and invalid as gzip; it supplies no recovered stage result.

The subsequent [closed raw CI archive](evidence/closed-raw-ci-observations.tar.gz)
and [full member receipt](evidence/closed-raw-ci-observations.json.gz) retain 777
complete inactive untracked observations, totaling 1,584,949 original bytes.
All originals were read back from the installed archive before their exact raw
duplicates were removed. Member names preserve their complete original paths;
the archive is 284,018 bytes and its compressed receipt is 49,116 bytes.
This reclaims 1,251,815 logical bytes; removed raw allocation was 3,833,856 bytes,
which is not the net allocated saving after archive storage.

The first packet attempt refused before writing because its complete archive
and receipt would exceed the fixed evidence cap. All originals stayed intact.
After lossless compression of three explicit closed observations reclaimed
46,167 logical bytes, the second full capture fit. The post-retirement census
was 498,389,195 bytes; this is a point-in-time observation, not an ongoing bound.
The full failed attempt and the compression receipt are members of the archive.
No source, cache, active file or foreign path was removed.

Retirement of the complete raw members of earlier committed receiving packets
remains independently recorded in the custody manifest and those packets.
Fifty-five remaining closed extracted CI files were also compared byte for byte
against every original ZIP member and retired, reclaiming 531,682 logical bytes;
the original complete ZIPs remain unchanged.

These are storage and provenance observations for
[PR #785](https://github.com/link-assistant/router/pull/785). They establish no
semantic authority, runtime gain, complete JavaScript gate or Rust verification.
