Require the original Host checker when capturing actual original primitive
TryFrom calls or integer constants, while preserving ordinary checking for
Host extensions whose programs contain neither. Every actual check, source-body
issuance and finalization retains its original private identity guards. Empty
captures revoke previous caller identities; malformed containers are inspected
without accessor, proxy or iterator callbacks. Keep existing ownership and
conversion regressions unchanged, and exercise real-source mutation/subclass
negatives. Source-only candidate: all new and existing tests are UNRUN.
