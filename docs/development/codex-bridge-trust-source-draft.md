# Selected CA trust through the Codex bridge draft

SOURCE ONLY; no CA loader, application/bridge, PKI fixture, compiler, parser,
translator, preparer or test executed. No CI feedback inspected. Full drafting
continues. The OpenSSL calls in independent fixture source are deferred tests,
not commands executed during drafting; no key/certificate was created now.

A shared paired loader reads at most 1MiB of a regular non-symlink selected CA
file, validates bounded certificate blocks and augments normal system roots.
HTTP and WebSocket bridge requests read that exact CA path afresh for each new
connection. They retain ordinary TLS chain, validity and hostname checks; no
rejectUnauthorized or identity-check bypass is introduced. Rotation/invalid bytes
cannot reuse a prior CA decode. The relay accepts only the selected ca option,
not arbitrary caller request settings or a new authorization bypass.

Temporary with passes its actual selected inference CA to its scoped bridge.
Persistent setup/configure pass selected context/trust; the owned daemon receives
only the CA path with its existing minimal child environment. State records and
reuse include that path and the fresh nonce ownership probe. Different paths
require owned restart; identical-path rotations are read at request time. Original
operator credentials remain absent from the bridge child. Existing advisory-lock
calls now use explicit options objects, so their intended 5s/3s budgets apply.

Sixteen complete compiler equations retain both ordered phases/full CST inverses
and three original native files. Existing original WebSocket library pins remain
unchanged through explicit full JS/TS source histories. The generic history reader
now supports Rust, JS and TS, requires one language per path and retains every
old native step: eleven steps across ten paths. Histories and certificate receipt
DATA grant no semantic/source namespace/executable authority and introduce no
source/owner/result cache.

Independent unrun source covers actual HTTPS and WebSocket handshakes, default
root augmentation, self-signed rejection without selected trust, wrong hostname
rejection with selected trust, fresh invalid/valid rotation, bounded malformed/
oversized/symlink input, full native-history joins and strict TS compilation.
Full certificate-chain/platform/rotation pressure, matching native Rust bridge
trust, persistent lifecycle/CA cross-process qualification and complete forward/
reverse/sync/parity/receiving/delivery remain OPEN. Rust stays CI only after all
eight same-SHA JavaScript stages. All verification remains deferred.
