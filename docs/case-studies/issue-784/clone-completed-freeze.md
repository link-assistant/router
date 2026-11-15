# Shared completed-data freezing for Clone

This source draft accompanies [PR #785](https://github.com/link-assistant/router/pull/785).
Clone's two complete evidence results now use the existing completed-data
freezer also used by PartialEq. The original recursive closure stays byte exact
and remains the fallback when native operations are observed or the bounded
plain-data traversal cannot qualify. Private issuers, complete evidence hashing,
the positive grammar and the early 32000-node / 64-level refusal remain intact.

The existing source producer retains its complete original archive and derives
both the earlier size-only afterimage and this new afterimage. Each receives
both serialized/reparsed CST phases and complete native inverses. The earlier
afterimage remains exactly `020c37eee3213f336b1e122b1c6189b9cd63052e793f1b359b82ab3f7a37c336`;
the new afterimage is `a6430936d7403ba1b63e3c0f044005353ed020214689d3e0a782cf55b7f969a2`.
The complete 5845688-byte proposal is retained before installation.

The new whole receiving file compares actual named, unit and payload-enum
routes against a fresh module made from the complete earlier source. It checks
complete outputs, original-plan hashes, deep freezing, cross-module issuer
refusals and mutations. With common dependencies and private plans initialized,
it also compares every Object.values/Object.freeze observer event, thrown error
identity and a successful retry after interruption. Every earlier assertion and
deadline stays unchanged.

Both complete receiving files pass all four cases under Node 20.20.2 with the
independent deadline audit (17.03 seconds, peak sampled cgroup 1780072448 bytes)
and Bun 1.4.4 (16.13 seconds, peak 1911250944 bytes). A separate three-route
probe retains identical complete 38725-byte output hashes before and after.
Its cold/warm timings are mixed: 1631.95/8.87/12.44 ms before and
2174.66/6.27/5.39 ms afterward. This finite observation establishes no overall
performance qualification.

The unchanged broader three-file Node cohort has 23 TAP passes but still fails
its independent deadline audit: the complete historical parent case takes
76791.194776 ms against its original 60000 ms limit. The command takes 113.98
seconds, peak sampled cgroup 2300903424 bytes. Bun completes three cases before
the owned memory guard stops the parent case at 2881613824 sampled cgroup
bytes after 53.35 seconds. All owned processes finish or are reaped. These
broader results remain failed/incomplete, with complete raw receipts retained.

This change adds zero newly executable production functions. Full generation,
strict parity, the complete gate and CI remain unqualified.
