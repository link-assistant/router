### Changed

- Reuse resolved written Default and Clone implementation families within their genuine immutable source contexts, retaining unresolved targets and nominal overlap refusals. Clone reuse also checks the captured module, binding and profile identities before using an entry.

### Validation

- All 32 cases in the three complete related fixture files pass under Node and Bun, including repeated target-specific overlap checks, unresolved generic targets and copied contexts. A bounded full-corpus byte comparison is running separately; this draft records no measured performance gain or parity claim.
