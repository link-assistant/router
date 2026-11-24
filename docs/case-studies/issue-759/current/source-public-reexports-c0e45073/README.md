# Checked public reexport owners

The focused source repair is tested at `c0e4507390b5a788ce03e8f1de524cf8ff822742`.
Resolved public reexports retain their checked canonical owner through private
implementation modules. Direct private paths and private suffixes still fail.

The 15-file regression batch passed all 124 cases in Node 20.19.4 (20.172 seconds)
and Bun 1.4.3 (14.416 seconds), without failures or skips. Both runners retained
the same clean source head and 1,353 input hashes. The source-input digest is
`20b2ef26067897fa76276f7a1d8ec8f96538214f36d80f23a652d9b9101a8618`.

The initial run at `29c5b0774e22ead46ca3b65b7caf34545240d03e` passed 122 of 123
cases in each runner. Its new positive fixture incorrectly assumed support for
two Rust namespaces sharing one canonical backend name. The final fixture uses
distinct canonical owners and retains that backend collision as an explicit
refusal. The resolver implementation did not change between these attempts.

[receipt.json](receipt.json) describes every attempt and archive member.
[evidence.tar.gz](evidence.tar.gz) preserves all four raw logs, receipts, complete
input manifests and both execution/archive helpers: 14 members, 315,611 bytes,
SHA-256 `0e672aa54b35442c6ede1e33610fe98e2cef429a333de386f1741f58bad125ae`.
Every member was reopened and verified without errors.

These checks exercised generated JavaScript and strictly compiled TypeScript
fixtures. They ran no corpus producers, full gate or Rust builds. Restoring the
unchanged retained-original `login_api.requested_provider` assertion requires
canonical regeneration and a separate check on those fresh artifacts. No whole
corpus gain, complete translation or native parity is claimed here. Child RSS
measurements include terminated harness children and do not measure aggregate
process-tree peak or physical footprint.
